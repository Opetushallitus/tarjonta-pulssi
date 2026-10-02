/**
 * Tyhjä korvike `@architect/functions`-paketille.
 *
 * `@react-router/architect` importtaa sen vain Arcin DynamoDB-pohjaista
 * sessiotallennusta (`createArcTableSessionStorage`) varten, jota tämä sovellus ei
 * käytä. Paketti lataa laiskasti joukon AWS SDK -asiakkaita (SNS, SQS, DynamoDB,
 * API Gateway Management), joita ei ole asennettu, joten esbuild kaatuu niiden
 * resolvointiin. Korvaus tehdään `--alias`-lipulla, ks. `stacks/tarjonta-pulssi.ts`.
 */
export default {};
