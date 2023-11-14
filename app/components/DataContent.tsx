import { PulssiData } from "~/shared/types";

import { EntitySection } from "./EntitySection";

export const DataContent = ({ data, showHistory }: { data: PulssiData; showHistory: boolean }) => {
  return (
    <div className="Content">
      <EntitySection entity="koulutus" data={data.koulutukset} showHistory={showHistory} />
      <EntitySection entity="toteutus" data={data.toteutukset} showHistory={showHistory} />
      <EntitySection entity="hakukohde" data={data.hakukohteet} showHistory={showHistory} />
      <EntitySection entity="haku" data={data.haut} showHistory={showHistory} />
    </div>
  );
};
