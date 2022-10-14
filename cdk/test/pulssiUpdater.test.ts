import { initializeSubBuckets } from "../lambda/elasticUtils";
import { RowWithKoulutustyyppiPath } from "../shared/types";

test("initializeSubBuckets should reset sub-bucket amounts to zero, if they exist in db response, but not in elastic", () => {
  const rows: Array<RowWithKoulutustyyppiPath> = [
    {
      tila: "julkaistu",
      tyyppi_path: "tuva/tuva-normal",
      amount: 1,
    },
  ];

  const elasticResBody = {
    took: 10,
    timed_out: false,
    aggregations: {
      by_tila: {
        sum_other_doc_count: 0,
        buckets: [
          {
            key: "arkistoitu",
            doc_count: 1,
            by_koulutustyyppi_path: {
              buckets: [
                {
                  key: "tuva/tuva-normal",
                  doc_count: 1,
                },
              ],
            },
          },
        ],
      },
    },
  };

  const expectedResBody = {
    took: 10,
    timed_out: false,
    aggregations: {
      by_tila: {
        sum_other_doc_count: 0,
        buckets: [
          {
            key: "arkistoitu",
            doc_count: 1,
            by_koulutustyyppi_path: {
              buckets: [
                {
                  key: "tuva/tuva-normal",
                  doc_count: 1,
                },
              ],
            },
          },
          {
            key: "julkaistu",
            doc_count: 0,
            by_koulutustyyppi_path: {
              buckets: [
                {
                  key: "tuva/tuva-normal",
                  doc_count: 0,
                },
              ],
            },
          },
        ],
      },
    },
  };

  expect(
    initializeSubBuckets(rows, elasticResBody as any, "by_koulutustyyppi_path")
  ).toMatchObject(expectedResBody);
});
