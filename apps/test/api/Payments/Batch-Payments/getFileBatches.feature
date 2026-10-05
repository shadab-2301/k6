@BatchPayments @API_Tests @getFileBatches
Feature: Get File Batches

    # Positive Scenarios

    Scenario: Verify Get File Batches Response passes with success 200 Ok and Schema Validation check
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch file batches with API Registry "<regFileName>" Object Name "<regObjectName>" for fileId "<fileId>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" sortDirection "<sortDirection>" filter "<filter>" and auth mode "<authMode>"
        Then I verify the Status Code is <statusCode> for the records
        Then I verify the response schema for the records with API Registry "<regFileName>" Object Name "<regObjectName>"
        Examples:
            | tcId | statusCode | regFileName                                        | regObjectName  | fileId          | page | size | search | sort | sortDirection | filter | authMode |
            |      | 200        | Payments-API\\Batch-Payments\\getFileBatchesAPIReg | getFileBatches | DYNAMIC_FILE_ID | 1    | 10   |        |      |               |        | withAuth |

    Scenario: Verify API Returns Batches for a Valid File ID
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch file batches with API Registry "<regFileName>" Object Name "<regObjectName>" for fileId "<fileId>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" sortDirection "<sortDirection>" filter "<filter>" and auth mode "<authMode>"
        Then I verify the Status Code is <statusCode> for the records
        Then I verify the response attribute "metaCurrentPage" equals "<page>" using jpath from API Registry "<regFileName>" and Object Name "<regObjectName>"
        Then I verify the response attribute "metaTotalCount" is greater than "0" using jpath from API Registry "<regFileName>" and Object Name "<regObjectName>"
        Then I verify get file batches response meta integrity
        Then I verify all batch records contain mandatory functional fields
        Examples:
            | tcId | statusCode | regFileName                                        | regObjectName  | fileId          | page | size | search | sort | sortDirection | filter | authMode |
            |      | 200        | Payments-API\\Batch-Payments\\getFileBatchesAPIReg | getFileBatches | DYNAMIC_FILE_ID | 1    | 10   |        |      |               |        | withAuth |

    Scenario: Verify API Returns Pagination Values correctly
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch file batches with API Registry "<regFileName>" Object Name "<regObjectName>" for fileId "<fileId>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" sortDirection "<sortDirection>" filter "<filter>" and auth mode "<authMode>"
        Then I verify the Status Code is <statusCode> for the records
        Then I verify the response attribute "metaCurrentPage" equals "<expectedPage>" using jpath from API Registry "<regFileName>" and Object Name "<regObjectName>"
        Then I verify the response attribute "metaCurrentPageSize" equals "<expectedSize>" using jpath from API Registry "<regFileName>" and Object Name "<regObjectName>"
        Examples:
            | tcId | statusCode | regFileName                                        | regObjectName  | fileId          | page | size | search | sort | sortDirection | filter | authMode | expectedPage | expectedSize |
            |      | 200        | Payments-API\\Batch-Payments\\getFileBatchesAPIReg | getFileBatches | DYNAMIC_FILE_ID |      |      |        |      |               |        | withAuth | 1            | 10           |

    Scenario: Verify API Filters Results by Batch Status
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch file batches with API Registry "<regFileName>" Object Name "<regObjectName>" for fileId "<fileId>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" sortDirection "<sortDirection>" filter "<filter>" and auth mode "<authMode>"
        Then I verify the Status Code is <statusCode> for the records
        Then I verify all response items have attribute "dataStatus" equal to "<filter>" using jpath from API Registry "<regFileName>" and Object Name "<regObjectName>"
        Examples:
            | tcId | statusCode | regFileName                                        | regObjectName  | fileId          | page | size | search | sort | sortDirection | filter   | authMode |
            |      | 200        | Payments-API\\Batch-Payments\\getFileBatchesAPIReg | getFileBatches | DYNAMIC_FILE_ID | 1    | 10   |        |      |               | PENDINIT | withAuth |

    Scenario: Verify API Filters Results by Batch Name Search Term
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch file batches with API Registry "<regFileName>" Object Name "<regObjectName>" for fileId "<fileId>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" sortDirection "<sortDirection>" filter "<filter>" and auth mode "<authMode>"
        Then I verify the Status Code is <statusCode> for the records
        Then I verify all response items have attribute "dataBatchName" containing "<search>" using jpath from API Registry "<regFileName>" and Object Name "<regObjectName>"
        Examples:
            | tcId | statusCode | regFileName                                        | regObjectName  | fileId          | page | size | search | sort | sortDirection | filter | authMode |
            |      | 200        | Payments-API\\Batch-Payments\\getFileBatchesAPIReg | getFileBatches | DYNAMIC_FILE_ID | 1    | 10   | Batch  |      |               |        | withAuth |

    Scenario: Verify API Sorts Results by Amount in Ascending Order
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch file batches with API Registry "<regFileName>" Object Name "<regObjectName>" for fileId "<fileId>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" sortDirection "<sortDirection>" filter "<filter>" and auth mode "<authMode>"
        Then I verify the Status Code is <statusCode> for the records
        Then I verify the response items are sorted by amount in "ascending" order using jpath key "dataAmount" from API Registry "<regFileName>" and Object Name "<regObjectName>"
        Examples:
            | tcId | statusCode | regFileName                                        | regObjectName  | fileId          | page | size | search | sort   | sortDirection | filter | authMode |
            |      | 200        | Payments-API\\Batch-Payments\\getFileBatchesAPIReg | getFileBatches | DYNAMIC_FILE_ID | 1    | 10   |        | amount | asce          |        | withAuth |

    Scenario: Verify API Sorts Results by Amount in Descending Order
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch file batches with API Registry "<regFileName>" Object Name "<regObjectName>" for fileId "<fileId>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" sortDirection "<sortDirection>" filter "<filter>" and auth mode "<authMode>"
        Then I verify the Status Code is <statusCode> for the records
        Then I verify the response items are sorted by amount in "descending" order using jpath key "dataAmount" from API Registry "<regFileName>" and Object Name "<regObjectName>"
        Examples:
            | tcId | statusCode | regFileName                                        | regObjectName  | fileId          | page | size | search | sort   | sortDirection | filter | authMode |
            |      | 200        | Payments-API\\Batch-Payments\\getFileBatchesAPIReg | getFileBatches | DYNAMIC_FILE_ID | 1    | 10   |        | amount | dsce          |        | withAuth |

    Scenario: Verify API Returns Empty Results for a File Without Batches
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch file batches with API Registry "<regFileName>" Object Name "<regObjectName>" for fileId "<fileId>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" sortDirection "<sortDirection>" filter "<filter>" and auth mode "<authMode>"
        Then I verify the Status Code is <statusCode> for the records
        Then I verify the response data array is empty
        Then I verify the response attribute "metaResultCount" equals "0" using jpath from API Registry "<regFileName>" and Object Name "<regObjectName>"
        Examples:
            | tcId | statusCode | regFileName                                        | regObjectName  | fileId          | page | size | search | sort | sortDirection | filter | authMode |
            |      | 200        | Payments-API\\Batch-Payments\\getFileBatchesAPIReg | getFileBatches | DYNAMIC_FILE_ID | 2    | 10   |        |      |               |        | withAuth |

    # Negative Scenarios

    Scenario: Verify API Rejects Invalid File ID
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch file batches with API Registry "<regFileName>" Object Name "<regObjectName>" for fileId "<fileId>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" sortDirection "<sortDirection>" filter "<filter>" and auth mode "<authMode>"
        Then I verify the Status Code is <statusCode> for the records
        And I verify the expected error message "<errorMessage>" with attribute "errorMessage" in API registry "<regFileName>" and "<regObjectName>"
        Examples:
            | tcId | statusCode | regFileName                                        | regObjectName  | fileId          | page | size | search | sort | sortDirection | filter | authMode | errorMessage |
            |      | 404        | Payments-API\\Batch-Payments\\getFileBatchesAPIReg | getFileBatches | INVALID_FILE_ID | 1    | 10   |        |      |               |        | withAuth | File         |

    Scenario: Verify API Rejects Empty File ID
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch file batches with API Registry "<regFileName>" Object Name "<regObjectName>" for fileId "<fileId>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" sortDirection "<sortDirection>" filter "<filter>" and auth mode "<authMode>"
        Then I verify the Status Code is <statusCode> for the records
        And I verify the expected error message "<errorMessage>" with attribute "errorTopMessage" in API registry "<regFileName>" and "<regObjectName>"
        Examples:
            | tcId | statusCode | regFileName                                        | regObjectName  | fileId | page | size | search | sort | sortDirection | filter | authMode | errorMessage |
            |      | 400        | Payments-API\\Batch-Payments\\getFileBatchesAPIReg | getFileBatches |        | 1    | 10   |        |      |               |        | withAuth | Bad Request  |

    Scenario: Verify API Rejects Page Parameter Below Minimum Value
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch file batches with API Registry "<regFileName>" Object Name "<regObjectName>" for fileId "<fileId>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" sortDirection "<sortDirection>" filter "<filter>" and auth mode "<authMode>"
        Then I verify the Status Code is <statusCode> for the records
        And I verify the expected error message "<errorMessage>" with attribute "errorMessage" in API registry "<regFileName>" and "<regObjectName>"
        Examples:
            | tcId | statusCode | regFileName                                        | regObjectName  | fileId          | page | size | search | sort | sortDirection | filter | authMode | errorMessage                        |
            |      | 400        | Payments-API\\Batch-Payments\\getFileBatchesAPIReg | getFileBatches | DYNAMIC_FILE_ID | 0    | 10   |        |      |               |        | withAuth | page: Page has a minimum value of 1 |

    Scenario: Verify API Rejects Page Size Exceeding Maximum Limit
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch file batches with API Registry "<regFileName>" Object Name "<regObjectName>" for fileId "<fileId>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" sortDirection "<sortDirection>" filter "<filter>" and auth mode "<authMode>"
        Then I verify the Status Code is <statusCode> for the records
        And I verify the expected error message "<errorMessage>" with attribute "errorMessage" in API registry "<regFileName>" and "<regObjectName>"
        Examples:
            | tcId | statusCode | regFileName                                        | regObjectName  | fileId          | page | size                  | search | sort | sortDirection | filter | authMode | errorMessage                       |
            |      | 400        | Payments-API\\Batch-Payments\\getFileBatchesAPIReg | getFileBatches | DYNAMIC_FILE_ID | 1    | 999999999999999999999 |        |      |               |        | withAuth | Invalid value for parameter 'size' |

    Scenario: Verify API Rejects Requests Without Authentication
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch file batches with API Registry "<regFileName>" Object Name "<regObjectName>" for fileId "<fileId>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" sortDirection "<sortDirection>" filter "<filter>" and auth mode "<authMode>"
        Then I verify the Status Code is <statusCode> for the records
        And I verify the expected error message "<errorMessage>" with attribute "errorTopMessage" in API registry "<regFileName>" and "<regObjectName>"
        Examples:
            | tcId | statusCode | regFileName                                        | regObjectName  | fileId          | page | size | search | sort | sortDirection | filter | authMode    | errorMessage |
            |      | 403        | Payments-API\\Batch-Payments\\getFileBatchesAPIReg | getFileBatches | DYNAMIC_FILE_ID | 1    | 10   |        |      |               |        | withoutAuth | Forbidden    |
