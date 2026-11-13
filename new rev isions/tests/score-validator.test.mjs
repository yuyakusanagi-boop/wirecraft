import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCircuitProof } from '../supabase/functions/submit-verified-score/score-validator.mjs';

const seriesLevelOne = {
  wires: [
    { a: 'source_0|right', b: 'switch_1|left' },
    { a: 'switch_1|right', b: 'bulb_2|left' },
    { a: 'bulb_2|right', b: 'source_0|left' }
  ],
  switches: [{ id: 'switch_1', closed: true }]
};

test('accepts a complete server-verifiable series circuit', () => {
  assert.deepEqual(validateCircuitProof(1, seriesLevelOne), { valid: true });
});

test('accepts a parallel circuit with all switches and loads in the paths', () => {
  const proof = {
    wires: [
      { a: 'source_0|right', b: 'switch_1|left' },
      { a: 'switch_1|right', b: 'bulb_3|left' },
      { a: 'bulb_3|right', b: 'source_0|left' },
      { a: 'source_0|right', b: 'switch_2|left' },
      { a: 'switch_2|right', b: 'bulb_4|left' },
      { a: 'bulb_4|right', b: 'source_0|left' }
    ],
    switches: [
      { id: 'switch_1', closed: true },
      { id: 'switch_2', closed: true }
    ]
  };
  assert.deepEqual(validateCircuitProof(5, proof), { valid: true });
});

test('accepts mixed-topology proof with every switch in the powered path', () => {
  const proof = {
    wires: [
      { a: 'source_0|right', b: 'switch_1|left' },
      { a: 'switch_1|right', b: 'bulb_4|left' },
      { a: 'bulb_4|right', b: 'switch_3|left' },
      { a: 'source_0|right', b: 'switch_2|left' },
      { a: 'switch_2|right', b: 'bulb_5|left' },
      { a: 'bulb_5|right', b: 'switch_3|left' },
      { a: 'switch_3|right', b: 'bulb_6|left' },
      { a: 'bulb_6|right', b: 'source_0|left' }
    ],
    switches: [
      { id: 'switch_1', closed: true },
      { id: 'switch_2', closed: true },
      { id: 'switch_3', closed: true }
    ]
  };
  assert.deepEqual(validateCircuitProof(15, proof), { valid: true });
});

test('rejects incomplete or shorted circuits', () => {
  assert.equal(validateCircuitProof(1, {
    ...seriesLevelOne,
    wires: seriesLevelOne.wires.slice(0, 2)
  }).valid, false);

  assert.equal(validateCircuitProof(1, {
    ...seriesLevelOne,
    wires: [
      ...seriesLevelOne.wires,
      { a: 'source_0|right', b: 'source_0|left' }
    ]
  }).valid, false);
});

test('rejects malformed, duplicate, and decoy connections', () => {
  assert.equal(validateCircuitProof(1, {
    ...seriesLevelOne,
    wires: [...seriesLevelOne.wires, seriesLevelOne.wires[0]]
  }).valid, false);

  assert.equal(validateCircuitProof(5, {
    wires: [{ a: 'source_0|right', b: 'bulb_5|left' }],
    switches: [
      { id: 'switch_1', closed: true },
      { id: 'switch_2', closed: true }
    ]
  }).valid, false);

  assert.equal(validateCircuitProof(1, seriesLevelOne).valid, true);
});

test('rejects invalid level numbers and missing switch state', () => {
  assert.equal(validateCircuitProof(31, seriesLevelOne).valid, false);
  assert.equal(validateCircuitProof(1, { wires: seriesLevelOne.wires, switches: [] }).valid, false);
});
