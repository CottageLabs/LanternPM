

API.add 'service/lantern/test',
  get:
    roleRequired: if API.settings.dev then undefined else 'root'
    action: () -> return API.service.lantern.test(this.queryParams.verbose)

API.service.lantern.test = (verbose) ->
  result = {passed:[],failed:[]}

  tests = [
    () ->
      result.processed = API.service.lantern.process doi: '10.1186/1758-2946-3-47'
      return _.isEqual JSON.parse(JSON.stringify(result.processed).toLowerCase()), JSON.parse(JSON.stringify(API.service.lantern.test._examples.result).toLowerCase())
  ]

  (if (try tests[t]()) then (result.passed.push(t) if result.passed isnt false) else result.failed.push(t)) for t of tests
  result.passed = result.passed.length if result.passed isnt false and result.failed.length is 0
  result = {passed:result.passed} if result.failed.length is 0 and not verbose
  return result



API.service.lantern.test._examples = {
  result: {
    "_id": undefined,
    "pmcid": "PMC3206455",
    "pmid": "21999661",
    "doi": "10.1186/1758-2946-3-47",
    "title": "Open bibliography for science, technology, and medicine.",
    "journal_title": "Journal of cheminformatics",
    "pure_oa": true,
    "issn": "1758-2946",
    "eissn": "1758-2946",
    "publication_date": "2011-01-01T00:00:00Z",
    "electronic_publication_date": "2011-10-14T00:00:00Z",
    "publisher": "Springer Science and Business Media LLC",
    "publisher_licence": "not applicable",
    "licence": "cc-by",
    "epmc_licence": "cc-by",
    "licence_source": "epmc_xml_permissions",
    "epmc_licence_source": "epmc_xml_permissions",
    "in_epmc": true,
    "epmc_xml": true,
    "aam": false,
    "open_access": true,
    "ahead_of_print": undefined,
    "romeo_colour": "green",
    "preprint_embargo": "unknown",
    "preprint_self_archiving": "can",
    "postprint_embargo": "unknown",
    "postprint_self_archiving": "can",
    "publisher_copy_embargo": "unknown",
    "publisher_copy_self_archiving": "can",
    "authors": [
      {
        "fullName": "Jones R",
        "firstName": "Richard",
        "lastName": "Jones",
        "initials": "R"
      },
      {
        "fullName": "Macgillivray M",
        "firstName": "Mark",
        "lastName": "Macgillivray",
        "initials": "M"
      },
      {
        "fullName": "Murray-Rust P",
        "firstName": "Peter",
        "lastName": "Murray-Rust",
        "initials": "P",
        "authorId": {
          "type": "ORCID",
          "value": "0000-0003-3386-3972"
        }
      },
      {
        "fullName": "Pitman J",
        "firstName": "Jim",
        "lastName": "Pitman",
        "initials": "J"
      },
      {
        "fullName": "Sefton P",
        "firstName": "Peter",
        "lastName": "Sefton",
        "initials": "P",
        "authorId": {
          "type": "ORCID",
          "value": "0000-0002-3545-944X"
        }
      },
      {
        "fullName": "O'Steen B",
        "firstName": "Ben",
        "lastName": "O'Steen",
        "initials": "B",
        "authorId": {
          "type": "ORCID",
          "value": "0000-0002-5175-7789"
        }
      },
      {
        "fullName": "Waites W",
        "firstName": "William",
        "lastName": "Waites",
        "initials": "W"
      }
    ],
    "in_core": true,
    "in_base": true,
    "repositories": [
      {
        "name": "Springer - Publisher Connector",
        "fulltexts": [
          "https://core.ac.uk/download/pdf/81869340.pdf"
        ]
      }
    ],
    "grants": [],
    "confidence": 1,
    #"score": 0, # note this has been removed from the csv line below too so would need to be added back in for that test to pass, if score is added again to lantern
    "provenance": [
      "Added PMCID from EUPMC",
      "Added PMID from EUPMC",
      "Added article title from EUPMC",
      "Confirmed is in EUPMC",
      "Confirmed is open access from EUPMC",
      "Added journal title from EUPMC",
      "Added issn from EUPMC",
      "Added eissn from EUPMC",
      "Added date of publication from EUPMC",
      "Added electronic publication date from EUPMC",
      "Confirmed fulltext XML is available from EUPMC",
      "Added EPMC licence (cc-by) from epmc_xml_permissions. If licence statements contain URLs we will try to find those in addition to searching for the statement's text. The match in this case was: 'This is an Open Access article distributed under the terms of the Creative Commons Attribution License' .",
      "Added author list from EUPMC",
      "Checked author manuscript status in EUPMC, found no evidence of being one",
      "Added publisher name from Crossref",
      "Found DOI in CORE",
      "Searched OpenDOAR but could not find repo and/or URL",
      "Added repositories that CORE claims article is available from",
      "Found DOI in BASE",
      "Searched OpenDOAR but could not find repo and/or URL",
      "Not attempting Grist API grant lookups since no grants data was obtained from EUPMC.",
      "Not checking ahead of print status on pubmed. The article is already in EUPMC.",
      "Confirmed journal is listed in DOAJ",
      "Added embargo and archiving data from Sherpa Romeo",
      "Not attempting to retrieve licence data via article publisher splash page lookup."
    ],
    "compliance_wellcome_standard": true,
    "compliance_wellcome_deluxe": true
  }
}