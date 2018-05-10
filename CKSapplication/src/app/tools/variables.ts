export let search_strategy_SR_head = ' AND "therapy"[Subheading] AND systematic[sb] AND ("systematic review"[ti] OR "meta-analysis"[ti]'
                                      + ' OR "Cochrane Database Syst Rev"[journal]) AND (';
export let search_strategy_tail = ') AND "humans"[MeSH Terms] AND "english"[language] AND hasabstract[text] AND jsubsetaim[text]' ;
export let search_strategy_RCT_broad = ' AND Therapy/Broad[filter] NOT (systematic[sb] OR "systematic review"[ti] OR "meta-analysis"[ti]'
                                       + ' OR "Cochrane Database Syst Rev"[journal]) AND (';
export let search_strategy_RCT_head_narrow = ' AND Therapy/Narrow[filter] NOT (systematic[sb] OR "systematic review"[ti] OR "meta-analysis"'
                                             + '[ti] OR "Cochrane Database Syst Rev"[journal]) AND (' ;
export let NUM_OF_DOCUMENT_IN_COLLECTION = 243776;
export let ITEM_PER_PAGE = 5;
export let MED_LIST_MIN = 10;
export let MED_LIST_MORE = 20;
export let meshTermfromAPIHead = 'https://uts-ws.nlm.nih.gov/rest/content/current/CUI/';
export let PMIDlistURIHead = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?&db=pubmed&retmode=json&rettype=uilist'
                             + '&retmax=100000&sort=relevance&term=';
export let meshTermfromAPImiddle = '/atoms?sabs=MSH&ttys=MH&ticket=';
export let ksUrl = 'https://service.oib.utah.edu:8443/KnowledgeSummary/json';
export let eutilsUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id=';
export let infobutton_mesh = { 'D000293': 'Adolescent', 'D000368': 'Aged', 'D000369': 'Aged, 80 and older',
                              'D008875': 'Middle aged', 'D055815': 'Young adult', 'D002648': 'Child', 'D007231': 'Infant, newborn',
                              'D0026750': 'Child, preschool', 'D000328': 'Adult', 'D007223': 'Infant' };
