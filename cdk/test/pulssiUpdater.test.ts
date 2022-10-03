import { getTilaBuckets } from "../lambda/shared";

test("getTilaBuckets should reset bucket amounts to zero, if they exist in db response, but not in elastic", () => {
  const dbRes = {
    rows: [
      {
        tila: "julkaistu",
        tyyppi_path: "tuva/tuva-normal",
        count: 1,
      },
    ],
  };

  const elasticRes = {
    aggregations: {
      by_tila: {
        buckets: [
          {
            key: "arkistoitu",
            doc_count: 1,
            aggregations: {
              by_koulutustyyppi_path: {
                buckets: [
                  {
                    key: "tuva/tuva-normal",
                    doc_count: 1,
                  },
                ],
              },
            },
          },
        ],
      },
    },
  };

  const expectedTilaBuckets = [
    {
      key: "arkistoitu",
      doc_count: 1,
      aggregations: {
        by_koulutustyyppi_path: {
          buckets: [
            {
              key: "tuva/tuva-normal",
              doc_count: 1,
            },
          ],
        },
      },
    },
    {
      key: "julkaistu",
      doc_count: 0,
      aggregations: {
        by_koulutustyyppi_path: {
          buckets: [
            {
              key: "tuva/tuva-normal",
              doc_count: 0,
            },
          ],
        },
      },
    },
  ];

  expect(
    getTilaBuckets(
      dbRes,
      elasticRes,
      "tyyppi_path",
      "by_koulutustyyppi_path"
    )
  ).toMatchObject(expectedTilaBuckets);
});
