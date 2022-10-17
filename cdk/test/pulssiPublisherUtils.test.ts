import { dbQueryResultToPulssiData } from "../lambda/pulssiPublisherUtils";

test("getPulssiEntityData", () => {
  expect(
    dbQueryResultToPulssiData(
      {
        rows: [
          {
            tyyppi_path: "amm/koulutustyyppi_1",
            julkaistu_amount: 50,
            arkistoitu_amount: 5,
          },
          {
            tyyppi_path: "amm/koulutustyyppi_13",
            julkaistu_amount: 40,
            arkistoitu_amount: 3,
          },
          {
            tyyppi_path: "yo",
            julkaistu_amount: 100,
            arkistoitu_amount: 15,
          },
        ],
      } as any,
      "toteutus"
    )
  ).toMatchObject({
    by_tila: {
      julkaistu_amount: 190,
      arkistoitu_amount: 23,
    },
    by_tyyppi: {
      amm: {
        julkaistu_amount: 90,
        arkistoitu_amount: 8,
        koulutustyyppi_1: {
          julkaistu_amount: 50,
          arkistoitu_amount: 5,
        },
        koulutustyyppi_13: {
          julkaistu_amount: 40,
          arkistoitu_amount: 3,
        },
      },
      yo: {
        julkaistu_amount: 100,
        arkistoitu_amount: 15,
      },
    },
  });
});
