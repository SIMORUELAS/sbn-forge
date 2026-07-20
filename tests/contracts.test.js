'use strict';

const {
  InspectorContract,
  RuleContract,
  GeneratorContract,
  TemplateEngineContract,
  OutputWriterContract
} = require('../src/contracts');

describe('Contratos internos de SBN Forge', () => {
  test('InspectorContract exige inspect()', async () => {
    const inspector = new InspectorContract();

    await expect(inspector.inspect()).rejects.toThrow(
      'debe implementar el método inspect()'
    );
  });

  test('RuleContract exige name', () => {
    const rule = new RuleContract();

    expect(() => rule.name).toThrow(
      'debe definir la propiedad name'
    );
  });

  test('GeneratorContract exige generate()', async () => {
    const generator = new GeneratorContract();

    await expect(generator.generate({})).rejects.toThrow(
      'debe implementar generate()'
    );
  });

  test('TemplateEngineContract exige render()', () => {
    const engine = new TemplateEngineContract();

    expect(() => engine.render('', {})).toThrow(
      'debe implementar render()'
    );
  });

  test('OutputWriterContract exige write()', async () => {
    const writer = new OutputWriterContract();

    await expect(writer.write('file.js', '')).rejects.toThrow(
      'debe implementar write()'
    );
  });
});