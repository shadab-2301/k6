@BatchPayments @API_Tests @getFiles
Feature: Get Files

    # ────────────────────────────────────────────────────────────────
    #  Positive Scenarios
    # ────────────────────────────────────────────────────────────────

    Scenario: Verify get files returns paginated results with default parameters
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch files with API Registry "<regFileName>" Object Name "<regObjectName>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" filter "<filter>" fromDate "<fromDate>" toDate "<toDate>"
        Then I verify the Status Code is <statusCode> for the records
        Then I verify the response schema for the records with API Registry "<regFileName>" Object Name "<regObjectName>"
        Then I verify the response attribute "metaCurrentPage" equals "<page>" using jpath from API Registry "<regFileName>" and Object Name "<regObjectName>"
        Then I verify the response attribute "metaCurrentPageSize" equals "<size>" using jpath from API Registry "<regFileName>" and Object Name "<regObjectName>"
        Then I verify the response attribute "metaResultCount" is less than or equal to "<size>" using jpath from API Registry "<regFileName>" and Object Name "<regObjectName>"
        Examples:
            | tcId | statusCode | regFileName                                  | regObjectName | page | size | search | sort | filter | fromDate | toDate |
            |      | 200        | Payments-API\\Batch-Payments\\getFilesAPIREG | getFiles      | 1    | 10   |        |      |        |          |        |

    Scenario: Verify get files with larger page size
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch files with API Registry "<regFileName>" Object Name "<regObjectName>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" filter "<filter>" fromDate "<fromDate>" toDate "<toDate>"
        Then I verify the Status Code is <statusCode> for the records
        Then I verify the response schema for the records with API Registry "<regFileName>" Object Name "<regObjectName>"
        Then I verify the response attribute "metaCurrentPageSize" equals "<size>" using jpath from API Registry "<regFileName>" and Object Name "<regObjectName>"
        Examples:
            | tcId | statusCode | regFileName                                  | regObjectName | page | size | search | sort | filter | fromDate | toDate |
            |      | 200        | Payments-API\\Batch-Payments\\getFilesAPIREG | getFiles      | 1    | 25   |        |      |        |          |        |

    Scenario: Verify get files with search by file name
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch files with API Registry "<regFileName>" Object Name "<regObjectName>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" filter "<filter>" fromDate "<fromDate>" toDate "<toDate>"
        Then I verify the Status Code is <statusCode> for the records
        Then I verify the response schema for the records with API Registry "<regFileName>" Object Name "<regObjectName>"
        Then I verify all response items have attribute "dataFileName" containing "<search>" using jpath from API Registry "<regFileName>" and Object Name "<regObjectName>"
        Examples:
            | tcId | statusCode | regFileName                                  | regObjectName | page | size | search     | sort | filter | fromDate | toDate |
            |      | 200        | Payments-API\\Batch-Payments\\getFilesAPIREG | getFiles      | 1    | 10   | Batch Test |      |        |          |        |

    Scenario: Verify get files with date range filter
        When I update the Azure test case ID "<tcId>"
        And I hit the API to upload a "Batch" with API Registry "<uploadRegFileName>" Object Name "<uploadRegObjectName>" for "<paymentMethod>" and attribute "<expAction>" with <numPayments> payments and amount "<amount>" using user "<userType>"
        Then I verify the API call succeeded
        And I hit the GET API to fetch files with API Registry "<regFileName>" Object Name "<regObjectName>" with query parameters page "<page>" size "<size>" search "" sort "<sort>" filter "<filter>" fromDate "<fromDate>" toDate "<toDate>"
        Then I verify the Status Code is <statusCode> for the records
        Then I verify the response schema for the records with API Registry "<regFileName>" Object Name "<regObjectName>"
        And I verify the uploaded file exists in the GET files response with the correct batch name and transaction count
        Examples:
            | tcId | statusCode | regFileName                                  | regObjectName | uploadRegFileName                                       | uploadRegObjectName | paymentMethod | expAction | numPayments | amount  | userType | page | size | sort | filter | fromDate       | toDate |
            |      | 200        | Payments-API\\Batch-Payments\\getFilesAPIREG | getFiles      | Payments-API\\Batch-Payments\\mockUploadBatchFileAPIReg | mockUploadBatchFile | EFT           | Approve   | 2           | 100-250 | BEW_USER | 1    | 10   |      |        | TODAY_MINUS_30 | TODAY  |

    Scenario: Verify get files with status filter
        When I update the Azure test case ID "<tcId>"
        And I hit the API to upload a "Batch" with API Registry "<uploadRegFileName>" Object Name "<uploadRegObjectName>" for "<paymentMethod>" and attribute "<expAction>" with <numPayments> payments and amount "<amount>" using user "<userType>"
        Then I verify the API call succeeded
        And I hit the GET API to fetch files with API Registry "<regFileName>" Object Name "<regObjectName>" with query parameters page "<page>" size "<size>" search "" sort "<sort>" filter "" fromDate "<fromDate>" toDate "<toDate>"
        Then I verify the API call succeeded
        And I verify the uploaded file exists in the GET files response with the correct batch name and transaction count
        And I wait for the uploaded file status to change to "PENDINIT" within 30 seconds
        And I hit the GET API to fetch files with API Registry "<regFileName>" Object Name "<regObjectName>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" filter "<filter>" fromDate "<fromDate>" toDate "<toDate>"
        Then I verify the Status Code is <statusCode> for the records
        Then I verify the response schema for the records with API Registry "<regFileName>" Object Name "<regObjectName>"
        Then I verify all response items have attribute "dataStatus" equal to "<filter>" using jpath from API Registry "<regFileName>" and Object Name "<regObjectName>"
        Examples:
            | tcId | statusCode | regFileName                                  | regObjectName | uploadRegFileName                                       | uploadRegObjectName | paymentMethod | expAction | numPayments | amount  | userType | page | size | search | sort | filter   | fromDate | toDate |
            |      | 200        | Payments-API\\Batch-Payments\\getFilesAPIREG | getFiles      | Payments-API\\Batch-Payments\\mockUploadBatchFileAPIReg | mockUploadBatchFile | EFT           | Approve   | 2           | 100-250 | BEW_USER | 1    | 10   |        |      | PENDINIT |          |        |

    Scenario: Verify get files with sort descending by uploaded date
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch files with API Registry "<regFileName>" Object Name "<regObjectName>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" filter "<filter>" fromDate "<fromDate>" toDate "<toDate>"
        Then I verify the Status Code is <statusCode> for the records
        Then I verify the response schema for the records with API Registry "<regFileName>" Object Name "<regObjectName>"
        Then I verify the response attribute "metaResultCount" is greater than "0" using jpath from API Registry "<regFileName>" and Object Name "<regObjectName>"
        Examples:
            | tcId | statusCode | regFileName                                  | regObjectName | page | size | search | sort         | filter | fromDate | toDate |
            |      | 200        | Payments-API\\Batch-Payments\\getFilesAPIREG | getFiles      | 1    | 10   |        | uploadedDate |        |          |        |


    # ────────────────────────────────────────────────────────────────
    #  Negative Scenarios
    # ────────────────────────────────────────────────────────────────

    Scenario: Verify get files fails with page zero
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch files with API Registry "<regFileName>" Object Name "<regObjectName>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" filter "<filter>" fromDate "<fromDate>" toDate "<toDate>"
        Then I verify the Status Code is <statusCode> for the records
        And I verify the expected error message "<errorMessage>" with attribute "errorMessage" in API registry "<regFileName>" and "<regObjectName>"
        Examples:
            | tcId | statusCode | regFileName                                  | regObjectName | page | size | search | sort | filter | fromDate | toDate | errorMessage                        |
            |      | 400        | Payments-API\\Batch-Payments\\getFilesAPIREG | getFiles      | 0    | 10   |        |      |        |          |        | page: Page has a minimum value of 1 |

    Scenario: Verify get files fails with negative page
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch files with API Registry "<regFileName>" Object Name "<regObjectName>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" filter "<filter>" fromDate "<fromDate>" toDate "<toDate>"
        Then I verify the Status Code is <statusCode> for the records
        And I verify the expected error message "<errorMessage>" with attribute "errorMessage" in API registry "<regFileName>" and "<regObjectName>"
        Examples:
            | tcId | statusCode | regFileName                                  | regObjectName | page | size | search | sort | filter | fromDate | toDate | errorMessage                        |
            |      | 400        | Payments-API\\Batch-Payments\\getFilesAPIREG | getFiles      | -1   | 10   |        |      |        |          |        | page: Page has a minimum value of 1 |

    Scenario: Verify get files fails with zero page size
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch files with API Registry "<regFileName>" Object Name "<regObjectName>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" filter "<filter>" fromDate "<fromDate>" toDate "<toDate>"
        Then I verify the Status Code is <statusCode> for the records
        And I verify the expected error message "<errorMessage>" with attribute "errorMessage" in API registry "<regFileName>" and "<regObjectName>"
        Examples:
            | tcId | statusCode | regFileName                                  | regObjectName | page | size | search | sort | filter | fromDate | toDate | errorMessage                             |
            |      | 400        | Payments-API\\Batch-Payments\\getFilesAPIREG | getFiles      | 1    | 0    |        |      |        |          |        | size: Page size has a minimum value of 1 |

    Scenario: Verify get files fails with invalid date format
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch files with API Registry "<regFileName>" Object Name "<regObjectName>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" filter "<filter>" fromDate "<fromDate>" toDate "<toDate>"
        Then I verify the Status Code is <statusCode> for the records
        And I verify the expected error message "<errorMessage>" with attribute "errorMessage" in API registry "<regFileName>" and "<regObjectName>"
        Examples:
            | tcId | statusCode | regFileName                                  | regObjectName | page | size | search | sort | filter | fromDate         | toDate | errorMessage                                                                      |
            |      | 400        | Payments-API\\Batch-Payments\\getFilesAPIREG | getFiles      | 1    | 10   |        |      |        | not-a-valid-date |        | Invalid value for parameter 'fromDate': 'not-a-valid-date'. Expected one of: null |

    Scenario: Verify get files fails with fromDate after toDate
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch files with API Registry "<regFileName>" Object Name "<regObjectName>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" filter "<filter>" fromDate "<fromDate>" toDate "<toDate>"
        Then I verify the Status Code is <statusCode> for the records
        And I verify the expected error message "<errorMessage>" with attribute "errorMessage" in API registry "<regFileName>" and "<regObjectName>"
        Examples:
            | tcId | statusCode | regFileName                                  | regObjectName | page | size | search | sort | filter | fromDate   | toDate     | errorMessage                                 |
            |      | 400        | Payments-API\\Batch-Payments\\getFilesAPIREG | getFiles      | 1    | 10   |        |      |        | 2026-12-31 | 2026-01-01 | min date must be before or equal to max date |
