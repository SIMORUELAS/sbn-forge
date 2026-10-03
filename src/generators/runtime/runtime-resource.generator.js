'use strict';

const path =
  require(
    'path'
  );

const {
  TemplateEngine
} =
  require(
    '../../core/template-engine'
  );

const {
  FileWriter
} =
  require(
    '../../core/file-writer'
  );

class RuntimeResourceGenerator {
  constructor({
    templatesDirectory
  } = {}) {
    this.templatesDirectory =
      templatesDirectory ||
      path.resolve(
        __dirname,
        '../../templates'
      );

    this.engine =
      new TemplateEngine({
        templatesDirectory:
          this.templatesDirectory
      });
  }

  async render(
    runtimeContext
  ) {
    this.validateContext(
      runtimeContext
    );

    const templateContext = {
      variableName:
        this.toVariableName(
          runtimeContext.name
        ),

      resourceJson:
        this.toTypeScriptObject(
          runtimeContext
        )
    };

    return this.engine.render(
      'runtime/resource.hbs',
      templateContext
    );
  }

  async generate(
    runtimeContext,
    {
      output,
      dryRun = false,
      force = false,
      writeMode
    } = {}
  ) {
    this.validateContext(
      runtimeContext
    );

    if (
      typeof output !==
        'string' ||
      output.trim() ===
        ''
    ) {
      throw new TypeError(
        'RuntimeResourceGenerator requiere options.output.'
      );
    }

    const content =
      await this.render(
        runtimeContext
      );

    const target =
      path.resolve(
        output,
        `${runtimeContext.name}.resource.ts`
      );

    const writer =
      new FileWriter({
        dryRun,
        force,
        writeMode
      });

    return writer.write(
      target,
      content
    );
  }

  validateContext(
    context
  ) {
    if (
      !context ||
      typeof context !==
        'object'
    ) {
      throw new TypeError(
        'RuntimeResourceGenerator requiere un contexto valido.'
      );
    }

    if (
      typeof context.name !==
        'string' ||
      context.name.trim() ===
        ''
    ) {
      throw new TypeError(
        'RuntimeResourceGenerator requiere context.name.'
      );
    }
  }

  toTypeScriptObject(
    value
  ) {
    return JSON.stringify(
      value,
      null,
      2
    ).replace(
      /^(\s*)"([A-Za-z_$][A-Za-z0-9_$]*)":/gm,
      '$1$2:'
    );
  }

  toVariableName(
    value
  ) {
    const parts =
      String(
        value || ''
      )
        .trim()
        .split(
          /[-_]+/
        )
        .filter(Boolean);

    return parts
      .map(
        (
          part,
          index
        ) => {
          const normalized =
            part.toLowerCase();

          if (
            index === 0
          ) {
            return normalized;
          }

          return (
            normalized.charAt(0)
              .toUpperCase() +
            normalized.slice(1)
          );
        }
      )
      .join('');
  }
}

module.exports =
  RuntimeResourceGenerator;
