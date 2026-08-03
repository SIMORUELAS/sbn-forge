'use strict';

const ScaffoldSeedBuilder =
  require(
    '../src/scaffold/scaffold-seed-builder'
  );

describe(
  'ScaffoldSeedBuilder',
  () => {
    test(
      'genera un seed desde columnas escribibles',
      () => {
        const builder =
          new ScaffoldSeedBuilder();

        const definition = {
          columns: [
            {
              name:
                'id',

              type:
                'uuid',

              writable:
                false
            },

            {
              name:
                'business_model_id',

              type:
                'uuid',

              writable:
                true,

              nullable:
                false,

              foreignKey: {
                table:
                  'ai_business_models'
              }
            },

            {
              name:
                'installation_code',

              type:
                'character varying',

              writable:
                true,

              nullable:
                true
            },

            {
              name:
                'installation_status',

              type:
                'character varying',

              writable:
                true,

              nullable:
                false,

              hasDefault:
                true,

              default:
                "'pending'::character varying"
            },

            {
              name:
                'configuration_json',

              type:
                'jsonb',

              writable:
                true,

              nullable:
                true
            }
          ]
        };

        const seeds =
          builder.build(
            definition
          );

        expect(
          seeds
        ).toHaveLength(
          1
        );

        expect(
          seeds[0]
        ).toEqual({
          business_model_id:
            '{{AI_BUSINESS_MODELS_ID}}',

         installation_code:
          'EXAMPLE-CODE',

          installation_status:
            'pending',

          configuration_json:
            {}
        });
      }
    );

    test(
      'ignora columnas no escribibles',
      () => {
        const builder =
          new ScaffoldSeedBuilder();

        const seeds =
          builder.build({
            columns: [
              {
                name:
                  'id',

                type:
                  'bigint',

                writable:
                  false
              },

              {
                name:
                  'created_at',

                type:
                  'timestamp',

                writable:
                  false
              }
            ]
          });

        expect(
          seeds
        ).toEqual([
          {}
        ]);
      }
    );
  }
);