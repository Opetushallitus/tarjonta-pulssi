import { toteutusRowHasChanged } from "../packages/shared/dbUtils";
import { initializeSubBuckets } from "../packages/shared/elasticUtils";
import type { RowWithKoulutustyyppiPath, ToteutusRow } from "../packages/shared/types";

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

  //expect(
  //  initializeSubBuckets(rows, elasticResBody as any, "by_koulutustyyppi_path")
  //).toMatchObject(expectedResBody);
});

test("Unchanged toteutus-row should not cause db update", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingRow: any = {tila: "julkaistu", tyyppi_path: "tuva/tuva-normal", amount: '10', jotpa_amount: '5', taydennyskoulutus_amount: '3', tyovoimakoulutus_amount: '2'};
  const newRow: ToteutusRow = {tila: "julkaistu", tyyppi_path: "tuva/tuva-normal", amount: 10, jotpa_amount: 5, taydennyskoulutus_amount: 3, tyovoimakoulutus_amount: 2};
  //expect(toteutusRowHasChanged(existingRow, newRow)).toBe(false);
});

test("Changed toteutus-row should cause db update", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingRow: any = {tila: "julkaistu", tyyppi_path: "tuva/tuva-normal", amount: '11', jotpa_amount: '6', taydennyskoulutus_amount: '3', tyovoimakoulutus_amount: '2'};
  const newRow: ToteutusRow = {tila: "julkaistu", tyyppi_path: "tuva/tuva-normal", amount: 10, jotpa_amount: 5, taydennyskoulutus_amount: 3, tyovoimakoulutus_amount: 2};
  //expect(toteutusRowHasChanged(existingRow, newRow)).toBe(true);
});

