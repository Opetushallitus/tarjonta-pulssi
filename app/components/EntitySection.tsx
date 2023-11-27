import { Box, Paper, Typography, styled } from "@mui/material";
import { useTranslation } from "react-i18next";

import { EntityTable } from "~/app/components/EntityTable";
import { ICONS } from "~/app/constants";
import type { EntityType, EntityDataWithSubKey } from "~/shared/types";

export const StyledEntitySection = styled(Paper)`
  border: 1px solid rgba(0, 0, 0, 0.15);
  box-sizing: border-box;
  background-color: white;
  display: flex;
  flex-direction: column;
  flex-shrink: 1;
  flex-grow: 1;
  flex-basis: auto;
  max-width: 550px;
  margin-right: 15px;
  margin-top: 15px;
  margin-bottom: 15px;
`;

export const StyledEntitySectionHeader = styled(Box)`
  display: flex;
  flex-direction: row;
  border-bottom: 1px solid rgba(0, 0, 0, 0.15);
  padding: 20px;
  align-items: center;
  justify-content: center;
`;

export const SectionHeading = styled(Typography)`
  font-size: 1.5rem;
  font-weight: 550;
  text-align: left;
  margin: 0;
  padding-left: 14px;
`;
export const EntitySection = ({
  entity,
  data,
  showHistory,
}: {
  entity: EntityType;
  data: EntityDataWithSubKey;
  showHistory: boolean;
}) => {
  const { t } = useTranslation();

  const IconComponent = ICONS[entity];
  return (
    <StyledEntitySection>
      <StyledEntitySectionHeader>
        <IconComponent />
        <SectionHeading variant="h2">{t(`${entity}_otsikko`)}</SectionHeading>
      </StyledEntitySectionHeader>
      <EntityTable data={data} entity={entity} showHistory={showHistory} />
    </StyledEntitySection>
  );
};
