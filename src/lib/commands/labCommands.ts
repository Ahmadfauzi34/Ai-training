import { asEdgeId } from '../types/core.ts';
import type { AppEdge, AppNode } from '../types';

export interface LabCommandResult {
  handled: boolean;
  message?: string;
  nodes?: AppNode[];
  edges?: AppEdge[];
}

const HELP = `Perintah lab (tidak memanggil LLM):
/help
/nodes
/show <node-id>
/set <node-id> <field> <value>
/connect <source-id> <target-id>
/disconnect <source-id> <target-id>

Field yang dapat diubah:
label, prompt, model, text, mode, operation, rows, cols, defaultValue`;

const EDITABLE_FIELDS: Record<AppNode['type'], ReadonlySet<string>> = {
  input: new Set(['label']),
  action: new Set(['label', 'prompt', 'model']),
  rag_memory: new Set(['label', 'text']),
  math_op: new Set(['label', 'operation', 'rows', 'cols', 'defaultValue']),
  rrm_reasoning: new Set(['label', 'mode'])
};

function parseValue(field: string, rawValue: string): unknown {
  if (field === 'rows' || field === 'cols') {
    const value = Number(rawValue);
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${field} harus berupa bilangan bulat positif.`);
    }
    return value;
  }

  if (field === 'defaultValue') {
    const value = JSON.parse(rawValue);
    if (!Array.isArray(value) || !value.every(item => typeof item === 'number')) {
      throw new Error('defaultValue harus berupa JSON array berisi angka.');
    }
    return value;
  }

  if (field === 'operation' && !['add', 'multiply', 'subtract', 'transpose', 'normalize'].includes(rawValue)) {
    throw new Error('operation harus add, multiply, subtract, transpose, atau normalize.');
  }

  if (field === 'mode' && !['sandbox', 'plr_proof', 'fhrr', 'entanglement'].includes(rawValue)) {
    throw new Error('mode harus sandbox, plr_proof, fhrr, atau entanglement.');
  }

  return rawValue;
}

function formatNodes(nodes: readonly AppNode[], edges: readonly AppEdge[]): string {
  if (nodes.length === 0) return 'Graph belum memiliki node.';

  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    const targets = outgoing.get(edge.source);
    if (targets) targets.push(edge.target);
    else outgoing.set(edge.source, [edge.target]);
  }

  return nodes.map(node => {
    const targets = outgoing.get(node.id) ?? [];
    const connection = targets.length > 0 ? ` → ${targets.join(', ')}` : '';
    return `• ${node.id} [${node.type}]${connection}`;
  }).join('\n');
}

export function executeLabCommand(
  input: string,
  nodes: readonly AppNode[],
  edges: readonly AppEdge[],
  createId: () => string = () => crypto.randomUUID()
): LabCommandResult {
  const commandText = input.trim();
  if (!commandText.startsWith('/')) return { handled: false };

  const [commandToken = '', ...args] = commandText.split(/\s+/);
  const command = commandToken.toLowerCase();

  if (command === '/help') return { handled: true, message: HELP };
  if (command === '/nodes') {
    return { handled: true, message: formatNodes(nodes, edges) };
  }

  if (command === '/show') {
    const nodeId = args[0];
    const node = nodes.find(candidate => candidate.id === nodeId);
    if (!node) return { handled: true, message: `Node '${nodeId ?? ''}' tidak ditemukan.` };
    return {
      handled: true,
      message: `${node.id} [${node.type}]\n${JSON.stringify(node.data, null, 2)}`
    };
  }

  if (command === '/set') {
    const [nodeId, field, ...valueParts] = args;
    if (!nodeId || !field || valueParts.length === 0) {
      return { handled: true, message: 'Format: /set <node-id> <field> <value>' };
    }
    const nodeIndex = nodes.findIndex(node => node.id === nodeId);
    if (nodeIndex < 0) return { handled: true, message: `Node '${nodeId}' tidak ditemukan.` };
    const node = nodes[nodeIndex]!;
    if (!EDITABLE_FIELDS[node.type].has(field)) {
      return {
        handled: true,
        message: `Field '${field}' tidak berlaku untuk node ${node.type}. Ketik /help.`
      };
    }

    try {
      const value = parseValue(field, valueParts.join(' '));
      const updatedNode = {
        ...node,
        data: { ...node.data, [field]: value }
      } as AppNode;
      const updatedNodes = [...nodes];
      updatedNodes[nodeIndex] = updatedNode;
      return {
        handled: true,
        nodes: updatedNodes,
        message: `✅ ${nodeId}.${field} diperbarui.`
      };
    } catch (error) {
      return {
        handled: true,
        message: `❌ ${(error as Error).message}`
      };
    }
  }

  if (command === '/connect') {
    const [source, target] = args;
    if (!source || !target) {
      return { handled: true, message: 'Format: /connect <source-id> <target-id>' };
    }
    if (!nodes.some(node => node.id === source) || !nodes.some(node => node.id === target)) {
      return { handled: true, message: 'Source atau target node tidak ditemukan.' };
    }
    if (source === target) {
      return { handled: true, message: 'Node tidak dapat dihubungkan ke dirinya sendiri.' };
    }
    if (edges.some(edge => edge.source === source && edge.target === target)) {
      return { handled: true, message: `${source} sudah terhubung ke ${target}.` };
    }

    const edge = {
      id: asEdgeId(createId()),
      source,
      target,
      type: 'smoothstep',
      animated: true
    } as AppEdge;
    return {
      handled: true,
      edges: [...edges, edge],
      message: `✅ ${source} → ${target} terhubung.`
    };
  }

  if (command === '/disconnect') {
    const [source, target] = args;
    if (!source || !target) {
      return { handled: true, message: 'Format: /disconnect <source-id> <target-id>' };
    }
    const updatedEdges = edges.filter(edge => edge.source !== source || edge.target !== target);
    if (updatedEdges.length === edges.length) {
      return { handled: true, message: `Koneksi ${source} → ${target} tidak ditemukan.` };
    }
    return {
      handled: true,
      edges: updatedEdges,
      message: `✅ Koneksi ${source} → ${target} dihapus.`
    };
  }

  return { handled: true, message: `Perintah '${command}' tidak dikenal.\n\n${HELP}` };
}
