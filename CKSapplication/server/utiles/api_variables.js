var homeURL, ksUrl;
if(process.env.NODE_ENV === 'prod') {
  homeURL =  'https://dev-newservice.oib.utah.edu:80';
  ksUrl = "https://service.oib.utah.edu:8443/KnowledgeSummary/json";
} else {
  homeURL = 'http://localhost:3000';
  ksUrl = "http://service.oib.utah.edu:8080/KnowledgeSummary/json";
}
module.exports = {
  search_strategy_SR_head: ' AND "therapy"[Subheading] AND systematic[sb] AND ("systematic review"[ti] OR "meta-analysis"[ti] OR "Cochrane Database Syst Rev"[journal]) AND (',
  search_strategy_tail: ') AND "humans"[MeSH Terms] AND "english"[language] AND hasabstract[text] AND jsubsetaim[text]',
  search_strategy_RCT_broad: ' AND Therapy/Broad[filter] NOT (systematic[sb] OR "systematic review"[ti] OR "meta-analysis"[ti] OR "Cochrane Database Syst Rev"[journal]) AND (',
  search_strategy_RCT_head_narrow: ' AND Therapy/Narrow[filter] NOT (systematic[sb] OR "systematic review"[ti] OR "meta-analysis"[ti] OR "Cochrane Database Syst Rev"[journal]) AND (',
  codeDict: {'2.16.840.1.113883.6.96':'SNOMEDCT_US', '2.16.840.1.113883.6.90':'ICD10CM',
                  '2.16.840.1.113883.6.3':'ICD10', '2.16.840.1.113883.6.42':'ICD9CM',
                  '2.16.840.1.113883.6.88':'RXNORM', 'http://snomed.info/sct':'SNOMEDCT_US',
  			         'http://hl7.org/fhir/sid/icd-9-cm':'ICD9CM', 'http://hl7.org/fhir/sid/icd-10-cm':'ICD10CM',
                 'http://hl7.org/fhir/sid/icd-10':'ICD10', 'http://www.nlm.nih.gov/research/umls/rxnorm':'RXNORM'},
  tgt_uri: 'https://utslogin.nlm.nih.gov/cas/v1/tickets',
  tgt_username: 'gdelfiol',
  tgt_password: 'WoodsHole2011',
  st_body: 'service=http://umlsks.nlm.nih.gov',
  cuiCodeURIHead: 'https://uts-ws.nlm.nih.gov/rest/search/current?inputType=sourceUi&searchType=exact&string=',
  cuiTermURIHead: 'https://uts-ws.nlm.nih.gov/rest/search/current?string=',
  meshTermfromAPIHead: 'https://uts-ws.nlm.nih.gov/rest/content/current/CUI/',
  PMIDlistURIHead: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?&db=pubmed&retmode=json&rettype=uilist&retmax=100000&sort=relevance&term=",
  meshTermfromAPImiddle: '/atoms?sabs=MSH&ttys=MH&ticket=',
  ksUrl: ksUrl,
  eutilsUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id=',
  homeURL: homeURL,
  databaseUser: 'cksDBuser',
  databasePass: 'cksDBpass',
  mongodb_url: 'mongodb://127.0.0.1:27017/logs'
};
