// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false,
  oauth2Enabled: true,
  redirectUrl: ['http://localhost:3000', 'http://localhost:3000/infobutton'],
  client_id: '8c38c74a-1c6e-4d6a-976a-34bcbfd06b77',
  scope: 'patient/Patient.read openid profile patient/Condition.read launch patient/MedicationOrder.read patient/MedicationStatement.read'
};
