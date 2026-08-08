'use strict';

const fs =
  require(
    'fs-extra'
  );

const os =
  require(
    'os'
  );

const path =
  require(
    'path'
  );

const {
  FileWriter
} = require(
  '../src/core/file-writer'
);

describe(
  'FileWriter',
  () => {
    test(
      'evita sobrescribir en modo create',
      async () => {
        const dir =
          await fs.mkdtemp(
            path.join(
              os.tmpdir(),
              'forge-'
            )
          );

        try {
          const file =
            path.join(
              dir,
              'a.txt'
            );

          await fs.writeFile(
            file,
            'x'
          );

          await expect(
            new FileWriter()
              .write(
                file,
                'y'
              )
          ).rejects.toThrow(
            /sobrescritura/
          );

          expect(
            await fs.readFile(
              file,
              'utf8'
            )
          ).toBe(
            'x'
          );
        }
        finally {
          await fs.remove(
            dir
          );
        }
      }
    );

    test(
      'sobrescribe con force',
      async () => {
        const dir =
          await fs.mkdtemp(
            path.join(
              os.tmpdir(),
              'forge-'
            )
          );

        try {
          const file =
            path.join(
              dir,
              'a.txt'
            );

          await fs.writeFile(
            file,
            'x'
          );

          const result =
            await new FileWriter({
              force:
                true
            }).write(
              file,
              'y'
            );

          expect(
            await fs.readFile(
              file,
              'utf8'
            )
          ).toBe(
            'y'
          );

          expect(
            result.overwritten
          ).toBe(
            true
          );
        }
        finally {
          await fs.remove(
            dir
          );
        }
      }
    );

    test(
      'permite regenerar en modo safe',
      async () => {
        const dir =
          await fs.mkdtemp(
            path.join(
              os.tmpdir(),
              'forge-'
            )
          );

        try {
          const file =
            path.join(
              dir,
              'a.txt'
            );

          await fs.writeFile(
            file,
            'version-anterior'
          );

          const result =
            await new FileWriter({
              writeMode:
                'safe'
            }).write(
              file,
              'version-nueva'
            );

          expect(
            await fs.readFile(
              file,
              'utf8'
            )
          ).toBe(
            'version-nueva'
          );

          expect(
            result.overwritten
          ).toBe(
            true
          );
        }
        finally {
          await fs.remove(
            dir
          );
        }
      }
    );

    test(
      'dry-run no escribe',
      async () => {
        const dir =
          await fs.mkdtemp(
            path.join(
              os.tmpdir(),
              'forge-'
            )
          );

        try {
          const file =
            path.join(
              dir,
              'a.txt'
            );

          await new FileWriter({
            dryRun:
              true
          }).write(
            file,
            'x'
          );

          expect(
            await fs.pathExists(
              file
            )
          ).toBe(
            false
          );
        }
        finally {
          await fs.remove(
            dir
          );
        }
      }
    );

    test(
      'rechaza modos de escritura desconocidos',
      () => {
        expect(
          () =>
            new FileWriter({
              writeMode:
                'desconocido'
            })
        ).toThrow(
          /Modo de escritura no soportado/
        );
      }
    );
  }
);