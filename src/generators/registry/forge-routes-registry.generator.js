'use strict';

const fs =
  require(
    'fs-extra'
  );

const path =
  require(
    'path'
  );

function toVariableName(
  moduleName
) {
  return moduleName
    .split('-')
    .filter(Boolean)
    .map(
      (
        part,
        index
      ) => {
        if (
          index === 0
        ) {
          return part;
        }

        return (
          part.charAt(0)
            .toUpperCase() +
          part.slice(1)
        );
      }
    )
    .join('');
}

function normalizeRelativePath(
  value
) {
  return value
    .replace(
      /\\/g,
      '/'
    );
}

class ForgeRoutesRegistryGenerator {
  constructor({
    rootDirectory =
      process.cwd()
  } = {}) {
    this.rootDirectory =
      rootDirectory;
  }

  async discoverModules(
    modulesDirectory
  ) {
    const absoluteModulesDirectory =
      path.resolve(
        this.rootDirectory,
        modulesDirectory
      );

    if (
      !await fs.pathExists(
        absoluteModulesDirectory
      )
    ) {
      return [];
    }

    const entries =
      await fs.readdir(
        absoluteModulesDirectory,
        {
          withFileTypes:
            true
        }
      );

    const modules = [];

    for (
      const entry of entries
    ) {
      if (
        !entry.isDirectory()
      ) {
        continue;
      }

      const moduleDirectory =
        path.join(
          absoluteModulesDirectory,
          entry.name
        );

      const manifestFile =
        path.join(
          moduleDirectory,
          'sbn-forge.manifest.json'
        );

      if (
        !await fs.pathExists(
          manifestFile
        )
      ) {
        continue;
      }

      const manifest =
        await fs.readJson(
          manifestFile
        );

      const moduleName =
        manifest.module?.name ||
        entry.name;

      const routesFile =
        path.join(
          moduleDirectory,
          `${moduleName}.routes.js`
        );

      if (
        !await fs.pathExists(
          routesFile
        )
      ) {
        continue;
      }

      modules.push({
        moduleName,

        variableName:
          toVariableName(
            moduleName
          ),

        moduleDirectory,

        routesFile,

        manifest
      });
    }

    return modules.sort(
      (
        left,
        right
      ) =>
        left.moduleName.localeCompare(
          right.moduleName
        )
    );
  }

  buildContents({
    modules,
    registryDirectory
  }) {
    const lines = [
      '\'use strict\';',
      ''
    ];

    for (
      const module of modules
    ) {
      const relativeRouteFile =
        normalizeRelativePath(
          path.relative(
            registryDirectory,
            module.routesFile
          )
        )
          .replace(
            /\.js$/i,
            ''
          );

      const requirePath =
        relativeRouteFile.startsWith('.')
          ? relativeRouteFile
          : `./${relativeRouteFile}`;

      lines.push(
        `const ${module.variableName} =`
      );

      lines.push(
        '  require('
      );

      lines.push(
        `    '${requirePath}'`
      );

      lines.push(
        '  );'
      );

      lines.push(
        ''
      );
    }

    lines.push(
      'async function registerForgeRoutes('
    );

    lines.push(
      '  fastify'
    );

    lines.push(
      ') {'
    );

    for (
      const module of modules
    ) {
      lines.push(
        '  await fastify.register('
      );

      lines.push(
        `    ${module.variableName}`
      );

      lines.push(
        '  );'
      );

      lines.push(
        ''
      );
    }

    lines.push(
      '}'
    );

    lines.push(
      ''
    );

    lines.push(
      'module.exports ='
    );

    lines.push(
      '  registerForgeRoutes;'
    );

    lines.push(
      ''
    );

    return lines.join(
      '\n'
    );
  }

  async generate({
    modulesDirectory,
    outputDirectory
  }) {
    const modules =
      await this.discoverModules(
        modulesDirectory
      );

    const registryDirectory =
      path.resolve(
        this.rootDirectory,
        outputDirectory
      );

    await fs.ensureDir(
      registryDirectory
    );

    const registryFile =
      path.join(
        registryDirectory,
        'sbn-forge.routes.js'
      );

    const contents =
      this.buildContents({
        modules,
        registryDirectory
      });

    await fs.writeFile(
      registryFile,
      contents,
      'utf8'
    );

    return {
      registryFile,

      modules
    };
  }
}

module.exports =
  ForgeRoutesRegistryGenerator;