import { usePulssiJson } from "./usePulssiJson";
import { EntityTable } from "./EntityTable";
import { ICONS } from "./constants";
import { useTranslations } from "./useTranslations";
import { Header } from "./Header";
import { Box, CircularProgress, Paper, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useLanguageState } from "./useLanguageState";
import "./app.css";
import { EntityDataWithSubKey, EntityType } from "../../cdk/shared/types";
import { SUPPORTED_LANGUAGES } from "../../cdk/shared/constants";

const StyledEntitySection = styled(Paper)`
  border: 1px solid rgba(0, 0, 0, 0.15);
  box-sizing: border-box;
  background-color: white;
  display: flex;
  flex-direction: column;
  flex-shrink: 1;
  flex-grow: 1;
  flex-basis: auto;
  max-width: 550px;
  margin: 15px;
`;

const StyledEntitySectionHeader = styled(Box)`
  display: flex;
  flex-direction: row;
  border-bottom: 1px solid rgba(0, 0, 0, 0.15);
  padding: 20px;
  align-items: center;
  justify-content: center;
`;

const SectionHeading = styled(Typography)`
  font-size: 1.5rem;
  font-weight: 500;
  text-align: left;
  margin: 0;
  padding-left: 14px;
`

const EntitySection = ({
  entity,
  data
}: {
  entity: EntityType;
  data: EntityDataWithSubKey;
}) => {
  const { t } = useTranslations();

  const IconComponent = ICONS[entity];
  return (
    <StyledEntitySection>
      <StyledEntitySectionHeader>
        <IconComponent />
        <SectionHeading variant="h2">{t(`${entity}_otsikko`)}</SectionHeading>
      </StyledEntitySectionHeader>
      <EntityTable data={data} entity={entity} />
    </StyledEntitySection>
  );
};

const useTitle = (title: string) => {
  if (title && title !== document.title) {
    document.title = title;
  }
};

export function App() {
  const { data, status } = usePulssiJson();

  const { t } = useTranslations();
  useTitle(t("sivu_otsikko"));

  const { lang, setLang } = useLanguageState();

  if (SUPPORTED_LANGUAGES.every((_) => _ !== lang)) {
    const userLanguage = window.navigator?.language?.split?.("-")?.[0];
    if (SUPPORTED_LANGUAGES.some((_) => _ === userLanguage)) {
      setLang(userLanguage);
    } else {
      setLang("fi");
    }
  }

  switch (status) {
    case "error":
      return <div>Error loading data!</div>;
    case "loading":
      return <CircularProgress />;
    case "success":
      return (
        <>
          <Header />
          <main>
            <EntitySection entity="koulutus" data={data?.koulutukset} />
            <EntitySection entity="toteutus" data={data?.toteutukset} />
            <EntitySection entity="hakukohde" data={data?.hakukohteet} />
            <EntitySection entity="haku" data={data?.haut} />
          </main>
        </>
      );
    default:
      return <div></div>;
  }
}
