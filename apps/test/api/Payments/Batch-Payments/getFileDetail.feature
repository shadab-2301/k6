@BatchPayments @API_Tests @GetFileDetail
Feature: Get File Details for uploaded batch payment file

    @1
    Scenario: Verify Get File Details Response passes with success 200 Ok and Schema Validation check
        When I update the Azure test case ID "<tcId>"

        ## Upload Batch FILE
        And I hit the API to upload a "Batch" with API Registry "<uploadRegFileName>" Object Name "<uploadRegObjectName>" for "<paymentMethod>" and attribute "<expAction>" with <numPayments> payments and amount "<amount>" using user "<userType>"
        Then I verify the API call succeeded

        ## Get Files and confirm uploaded file
        When I hit the GET API to fetch files with API Registry "<getFilesRegFileName>" Object Name "<getFilesRegObjectName>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" filter "<filter>" fromDate "<fromDate>" toDate "<toDate>"
        Then I verify the API call succeeded
        And I verify the uploaded file exists in the GET files response with the correct batch name and transaction count
        And I verify the uploaded file details match the GET files response using dynamic jpath
        And I wait for the uploaded file status to change to "PENDINIT" within 30 seconds

        ## Get File Details by dynamic fileId
        When I hit the GET API to fetch uploaded file details with API Registry "<getFileDetailRegFileName>" Object Name "<getFileDetailRegObjectName>" using dynamic fileId
        Then I verify the API call succeeded
        And I verify the response schema for the records with API Registry "<getFileDetailRegFileName>" Object Name "<getFileDetailRegObjectName>"
        And I verify get file detail response for uploaded batch file business integrity
        And I verify get file detail response contains critical metadata fields
        And I verify get file detail response status has code and description
        And I verify get file detail response record counts are consistent
        And I verify get file detail response batch summary is consistent
        And I verify get file detail response amount and file size are valid
        And I verify get file detail response metadata source fields are populated
        And I verify get file detail response fileId format is alphanumeric

        Examples:
            | tcId | numPayments | amount  | userType | uploadRegFileName                                       | uploadRegObjectName | getFilesRegFileName                          | getFilesRegObjectName | getFileDetailRegFileName                          | getFileDetailRegObjectName | paymentMethod | expAction | page | size | search | sort | filter | fromDate | toDate |
            |      | 2           | 100-250 | BEW_USER | Payments-API\\Batch-Payments\\mockUploadBatchFileAPIReg | mockUploadBatchFile | Payments-API\\Batch-Payments\\getFilesAPIREG | getFiles              | Payments-API\\Batch-Payments\\getFileDetailAPIReg | getFileDetail              | EFT           | Approve   | 1    | 10   |        |      |        |          |        |

    Scenario: Verify Successful Retrieval of Payment File Details for a Valid File ID
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch file details with API Registry "<regFileName>" Object Name "<regObjectName>" for fileId "<fileId>" and auth mode "<authMode>"
        Then I verify the API call succeeded
        And I verify get file detail response contains critical metadata fields
        And I verify get file detail response fileId format is alphanumeric

        Examples:
            | tcId | regFileName                                       | regObjectName | fileId          | authMode |
            |      | Payments-API\\Batch-Payments\\getFileDetailAPIReg | getFileDetail | DYNAMIC_FILE_ID | withAuth |

    Scenario: Verify File Status is Returned with Correct Code and Description
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch file details with API Registry "<regFileName>" Object Name "<regObjectName>" for fileId "<fileId>" and auth mode "<authMode>"
        Then I verify the API call succeeded
        And I verify get file detail response status has code and description

        Examples:
            | tcId | regFileName                                       | regObjectName | fileId          | authMode |
            |      | Payments-API\\Batch-Payments\\getFileDetailAPIReg | getFileDetail | DYNAMIC_FILE_ID | withAuth |

    Scenario: Verify Details for a File in Validation In Progress State
        When I update the Azure test case ID "<tcId>"
        And I hit the API to upload a "Batch" with API Registry "<uploadRegFileName>" Object Name "<uploadRegObjectName>" for "<paymentMethod>" and attribute "<expAction>" with <numPayments> payments and amount "<amount>" using user "<userType>"
        Then I verify the API call succeeded
        When I hit the GET API to fetch files with API Registry "<getFilesRegFileName>" Object Name "<getFilesRegObjectName>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" filter "<filter>" fromDate "<fromDate>" toDate "<toDate>"
        Then I verify the API call succeeded
        And I verify the uploaded file exists in the GET files response with the correct batch name and transaction count
        And I hit the GET API to fetch uploaded file details with API Registry "<getFileDetailRegFileName>" Object Name "<getFileDetailRegObjectName>" using dynamic fileId
        And I verify the API call succeeded
        And I verify get file detail response status code is one of "VAL_IN_PROG,PENDINIT"
        And I verify get file detail response status has code and description

        Examples:
            | tcId | numPayments | amount    | userType | uploadRegFileName                                       | uploadRegObjectName | getFilesRegFileName                          | getFilesRegObjectName | getFileDetailRegFileName                          | getFileDetailRegObjectName | paymentMethod | expAction | page | size | search | sort | filter | fromDate | toDate |
            |      | 2           | 2000-3500 | BEW_USER | Payments-API\\Batch-Payments\\mockUploadBatchFileAPIReg | mockUploadBatchFile | Payments-API\\Batch-Payments\\getFilesAPIREG | getFiles              | Payments-API\\Batch-Payments\\getFileDetailAPIReg | getFileDetail              | EFT           | Approve   | 1    | 10   |        |      |        |          |        |

    Scenario Outline: Verify Get File Details negative authorization and input validations
        When I update the Azure test case ID "<tcId>"
        And I hit the GET API to fetch file details with API Registry "<regFileName>" Object Name "<regObjectName>" for fileId "<fileId>" and auth mode "<authMode>"
        Then I verify the response status code is one of "<allowedStatusCodes>"
        And I verify get file detail error response is present

        Examples:
            | tcId | regFileName                                       | regObjectName | fileId            | authMode    | allowedStatusCodes |
            |      | Payments-API\\Batch-Payments\\getFileDetailAPIReg | getFileDetail | INVALID_FILE_ID   | withAuth    | 404                |
            |      | Payments-API\\Batch-Payments\\getFileDetailAPIReg | getFileDetail | MALFORMED_FILE_ID | withAuth    | 400,404            |
            |      | Payments-API\\Batch-Payments\\getFileDetailAPIReg | getFileDetail | EMPTY             | withAuth    | 400,404            |
            |      | Payments-API\\Batch-Payments\\getFileDetailAPIReg | getFileDetail | DELETED_FILE_ID   | withAuth    | 404                |
            |      | Payments-API\\Batch-Payments\\getFileDetailAPIReg | getFileDetail | DYNAMIC_FILE_ID   | withoutAuth | 401,403            |
