const LEVELS = [
  [1, 1, 'SERIES'], [1, 2, 'SERIES'], [1, 2, 'SERIES'],
  [1, 2, 'SERIES'], [2, 2, 'PARALLEL'], [2, 2, 'PARALLEL'],
  [2, 3, 'SERIES'], [2, 2, 'SERIES'], [2, 2, 'SERIES'],
  [2, 2, 'SERIES'], [2, 3, 'PARALLEL'], [2, 2, 'PARALLEL'],
  [2, 3, 'PARALLEL'], [3, 2, 'SERIES'], [3, 3, 'MIXED'],
  [3, 3, 'SERIES'], [3, 3, 'PARALLEL'], [3, 3, 'MIXED'],
  [3, 4, 'MIXED'], [4, 3, 'SERIES'], [4, 4, 'PARALLEL'],
  [4, 4, 'MIXED'], [4, 4, 'MIXED'], [4, 4, 'MIXED'],
  [5, 4, 'PARALLEL'], [5, 4, 'MIXED'], [5, 5, 'MIXED'],
  [5, 5, 'MIXED'], [6, 5, 'MIXED'], [7, 6, 'MIXED']
];

const TERMINAL_PATTERN = /^([a-z]+_\d+)\|(left|right)$/;

function createComponents(level) {
  const [switchCount, bulbCount] = LEVELS[level - 1];
  const components = [{ id: 'source_0', type: 'source', decoy: false }];

  for (let index = 0; index < switchCount; index += 1) {
    components.push({ id: `switch_${components.length}`, type: 'switch', decoy: false });
  }
  for (let index = 0; index < bulbCount; index += 1) {
    components.push({ id: `bulb_${components.length}`, type: 'bulb', decoy: false });
  }

  const decoyCount = Math.floor((level - 1) / 3);
  for (let index = 0; index < decoyCount; index += 1) {
    const type = index % 2 ? 'switch' : 'bulb';
    components.push({ id: `${type}_${components.length}`, type, decoy: true });
  }

  return components;
}

function reachable(graph, start, target) {
  const queue = [start];
  const visited = new Set(queue);
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current === target) return true;
    for (const next of graph.get(current) || []) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }
  return false;
}

function addEdge(graph, from, to) {
  if (!graph.has(from)) graph.set(from, []);
  graph.get(from).push(to);
}

function validateProofShape(components, proof) {
  if (!proof || !Array.isArray(proof.wires) || !Array.isArray(proof.switches)) {
    throw new Error('Proof must include wires and switch states.');
  }
  if (proof.wires.length > 64) throw new Error('Too many wires in proof.');

  const componentMap = new Map(components.map((component) => [component.id, component]));
  const wires = [];
  const wirePairs = new Set();
  for (const wire of proof.wires) {
    if (!wire || typeof wire.a !== 'string' || typeof wire.b !== 'string') {
      throw new Error('Each wire must have two terminal keys.');
    }
    const first = wire.a.match(TERMINAL_PATTERN);
    const second = wire.b.match(TERMINAL_PATTERN);
    if (!first || !second || !componentMap.has(first[1]) || !componentMap.has(second[1])) {
      throw new Error('Wire references an unknown terminal.');
    }
    if (componentMap.get(first[1]).decoy || componentMap.get(second[1]).decoy) {
      throw new Error('Decoy components cannot be used.');
    }
    if (wire.a === wire.b) throw new Error('A terminal cannot connect to itself.');
    const pair = [wire.a, wire.b].sort().join('::');
    if (wirePairs.has(pair)) throw new Error('Duplicate wires are not allowed.');
    wirePairs.add(pair);
    wires.push({ a: wire.a, b: wire.b });
  }

  const realSwitches = components.filter((component) =>
    component.type === 'switch' && !component.decoy
  );
  if (proof.switches.length !== realSwitches.length) {
    throw new Error('Proof must include every real switch exactly once.');
  }
  const switchStates = new Map();
  for (const item of proof.switches) {
    if (!item || typeof item.id !== 'string' || typeof item.closed !== 'boolean') {
      throw new Error('Each switch state must have an id and boolean state.');
    }
    if (!realSwitches.some((component) => component.id === item.id) || switchStates.has(item.id)) {
      throw new Error('Proof references an unknown or duplicate switch.');
    }
    switchStates.set(item.id, item.closed);
  }
  return { wires, switchStates, componentMap };
}

function isValidCircuit(level, wires, switchStates, components) {
  const [, , target] = LEVELS[level - 1];
  const realComponents = components.filter((component) => !component.decoy);
  const source = realComponents.find((component) => component.type === 'source');
  const bulbs = realComponents.filter((component) => component.type === 'bulb');
  const switches = realComponents.filter((component) => component.type === 'switch');
  const key = (id, side) => `${id}|${side}`;
  const sourcePlus = key(source.id, 'right');
  const sourceMinus = key(source.id, 'left');

  const conductorGraph = new Map();
  const electricalGraph = new Map();
  for (const wire of wires) {
    addEdge(conductorGraph, wire.a, wire.b);
    addEdge(conductorGraph, wire.b, wire.a);
    addEdge(electricalGraph, wire.a, wire.b);
    addEdge(electricalGraph, wire.b, wire.a);
  }
  for (const component of switches) {
    if (!switchStates.get(component.id)) continue;
    const left = key(component.id, 'left');
    const right = key(component.id, 'right');
    addEdge(conductorGraph, left, right);
    addEdge(conductorGraph, right, left);
    addEdge(electricalGraph, left, right);
    addEdge(electricalGraph, right, left);
  }
  for (const bulb of bulbs) {
    addEdge(electricalGraph, key(bulb.id, 'left'), key(bulb.id, 'right'));
  }

  if (reachable(conductorGraph, sourcePlus, sourceMinus)) return false;
  const lit = bulbs.filter((bulb) => (
    reachable(electricalGraph, sourcePlus, key(bulb.id, 'left')) &&
    reachable(electricalGraph, key(bulb.id, 'right'), sourceMinus)
  ));
  if (lit.length !== bulbs.length) return false;

  const parent = new Map();
  const find = (terminal) => {
    if (!parent.has(terminal)) parent.set(terminal, terminal);
    const root = parent.get(terminal);
    if (root !== terminal) parent.set(terminal, find(root));
    return parent.get(terminal);
  };
  const union = (first, second) => {
    const firstRoot = find(first);
    const secondRoot = find(second);
    if (firstRoot !== secondRoot) parent.set(firstRoot, secondRoot);
  };
  for (const component of realComponents) {
    find(key(component.id, 'left'));
    find(key(component.id, 'right'));
  }
  for (const wire of wires) union(wire.a, wire.b);

  const netOf = (terminal) => find(terminal);
  const edges = [];
  for (const component of [...bulbs, ...switches]) {
    if (component.type === 'switch' && !switchStates.get(component.id)) continue;
    const left = netOf(key(component.id, 'left'));
    const right = netOf(key(component.id, 'right'));
    edges.push({ component, left, right, self: left === right });
  }

  const pairs = new Map();
  const degrees = new Map();
  const adjacency = new Map();
  for (const edge of edges) {
    if (edge.self) continue;
    const pair = [edge.left, edge.right].sort().join('::');
    pairs.set(pair, (pairs.get(pair) || 0) + 1);
    degrees.set(edge.left, (degrees.get(edge.left) || 0) + 1);
    degrees.set(edge.right, (degrees.get(edge.right) || 0) + 1);
    if (!adjacency.has(edge.left)) adjacency.set(edge.left, []);
    if (!adjacency.has(edge.right)) adjacency.set(edge.right, []);
    adjacency.get(edge.left).push(edge.right);
    adjacency.get(edge.right).push(edge.left);
  }

  const plus = netOf(sourcePlus);
  const minus = netOf(sourceMinus);
  if (plus === minus) return false;
  let pathCount = 0;
  const walk = (node, seen) => {
    if (pathCount >= 50) return;
    if (node === minus) {
      pathCount += 1;
      return;
    }
    for (const next of adjacency.get(node) || []) {
      if (seen.has(next)) continue;
      seen.add(next);
      walk(next, seen);
      seen.delete(next);
    }
  };
  walk(plus, new Set([plus]));

  const parallel = pathCount > 1 || [...pairs.values()].some((count) => count >= 2);
  const junction = [...degrees].some(([net, degree]) =>
    net !== plus && net !== minus && degree > 2
  );
  const actual = parallel && junction
    ? 'MIXED'
    : parallel
      ? 'PARALLEL'
      : junction
        ? 'MIXED'
        : 'SERIES';
  if (actual !== target) return false;

  if (target === 'SERIES') {
    for (const wire of wires) {
      const [firstId] = wire.a.split('|');
      const [secondId] = wire.b.split('|');
      const first = components.find((component) => component.id === firstId);
      const second = components.find((component) => component.id === secondId);
      if (first?.type !== 'bulb' || second?.type !== 'bulb') continue;
      const firstPositive = wire.a.endsWith('|left');
      const secondPositive = wire.b.endsWith('|left');
      if (firstPositive === secondPositive) return false;
    }

    const componentEdges = new Map();
    for (const edge of edges) {
      if (edge.self) continue;
      if (!componentEdges.has(edge.left)) componentEdges.set(edge.left, []);
      if (!componentEdges.has(edge.right)) componentEdges.set(edge.right, []);
      componentEdges.get(edge.left).push({ net: edge.right, component: edge.component });
      componentEdges.get(edge.right).push({ net: edge.left, component: edge.component });
    }
    let current = plus;
    const used = new Set();
    const visitedBulbs = new Set();
    let guard = 0;
    while (current !== minus && guard < edges.length + 2) {
      guard += 1;
      const options = (componentEdges.get(current) || [])
        .filter((edge) => !used.has(edge.component.id));
      if (options.length !== 1) return false;
      const step = options[0];
      const component = step.component;
      used.add(component.id);
      if (component.type === 'bulb') {
        if (current !== netOf(key(component.id, 'left')) ||
            step.net !== netOf(key(component.id, 'right'))) return false;
        visitedBulbs.add(component.id);
      }
      current = step.net;
    }
    if (current !== minus || visitedBulbs.size !== bulbs.length) return false;
    if (bulbs.some((bulb) =>
      netOf(key(bulb.id, 'left')) === netOf(key(bulb.id, 'right'))
    )) return false;
    return true;
  }

  for (const component of switches) {
    if (!switchStates.get(component.id)) return false;
    const connected = wires.some((wire) =>
      wire.a.startsWith(`${component.id}|`) || wire.b.startsWith(`${component.id}|`)
    );
    if (!connected) return false;
    const path = (node, usedSwitch, seen) => {
      if (node === minus) return usedSwitch;
      for (const edge of edges) {
        if (edge.self || (edge.left !== node && edge.right !== node)) continue;
        const next = edge.left === node ? edge.right : edge.left;
        if (seen.has(next)) continue;
        seen.add(next);
        const found = path(
          next,
          usedSwitch || edge.component.id === component.id,
          seen
        );
        seen.delete(next);
        if (found) return true;
      }
      return false;
    };
    if (!path(plus, false, new Set([plus]))) return false;
  }

  return bulbs.every((bulb) => wires.some((wire) =>
    wire.a.startsWith(`${bulb.id}|`) || wire.b.startsWith(`${bulb.id}|`)
  ));
}

export function validateCircuitProof(level, proof) {
  if (!Number.isInteger(level) || level < 1 || level > LEVELS.length) {
    return { valid: false, error: 'Level must be an integer from 1 to 30.' };
  }

  try {
    const components = createComponents(level);
    const { wires, switchStates } = validateProofShape(components, proof);
    return isValidCircuit(level, wires, switchStates, components)
      ? { valid: true }
      : { valid: false, error: 'The submitted wiring does not solve this circuit.' };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
