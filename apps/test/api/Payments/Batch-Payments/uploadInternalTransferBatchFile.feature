@hybrid @BatchPayments @singleINTAuthBatch @BatchPaymentsE2E @InternalTransfer
Feature: Upload Internal Transfer Batch - End-to-End Flow

  Scenario: Upload and initiate internal transfer batch file and verify it appears in file list
    When I update the Azure test case ID "<tcId>"
    ## Upload Batch FILE (Internal Transfer)
    And I hit the API to upload a "Batch" with API Registry "<regFileName>" Object Name "<regObjectName>" for "<paymentMethod>" and attribute "<expAction>" with <numPayments> payments and amount "<amount>" using user "<userType>"
    Then I verify the Status Code is <statusCode> for the records
    Then I verify the response schema for the records with API Registry "<regFileName>" Object Name "<regObjectName>"

    ## Get Files
    When I hit the GET API to fetch files with API Registry "<getRegFileName>" Object Name "<getRegObjectName>" with query parameters page "<page>" size "<size>" search "<search>" sort "<sort>" filter "<filter>" fromDate "<fromDate>" toDate "<toDate>"
    Then I verify the Status Code is <getStatusCode> for the records
    Then I verify the uploaded file exists in the GET files response with the correct batch name and transaction count
    Then I verify the uploaded file details match the GET files response using dynamic jpath
    Then I wait for the uploaded file status to change to "PENDINIT" within 30 seconds

    ## Get File Batches
    Then I hit the GET API to fetch batches for the uploaded file with API Registry "<getBatchesRegFileName>" Object Name "<getBatchesRegObjectName>"
    Then I verify the Status Code is <getBatchesStatusCode> for the records

    ## Initiate Internal Transfer Batch
    Then I hit the POST API to initiate batch payment with API Registry "<initiateRegFileName>" Object Name "<initiateRegObjectName>" and rail "<rail>" and channel "<channel>"
    Then I verify the Status Code is <initiateStatusCode> for the records

    ## UI validations
    And I switch to the browser
    When the user login using the following credentials
      | username       | password |
      | BEW_SIngleAuth | PASSWORD |
    Given the user has selected the business banking application
    When the user clicks the Apollo "Payments" left hand navigation menu
    When the user click on "Files" top menu navigation
    Then I verify the uploaded batch file appears with correct details in the Files list
    Then I validate UI fields against API response with checklist using expected status "<expectedStatus>"
    Then I verify the batch file uploader information is populated
    Then I verify the batch file status in list is exactly "<expectedStatus>"

    When I click on the batch file to view details
    Then I verify the batch file detail page loads successfully
    Then I verify the batch file detail page shows the correct file name
    Then I verify the batch file detail page shows uploaded file id
    Then I verify the batch file detail page status is exactly "<expectedStatus>"

    Examples:
      | tcId | numPayments | amount | userType | statusCode | getStatusCode | getBatchesStatusCode | initiateStatusCode | regFileName                                             | regObjectName       | getRegFileName                               | getRegObjectName | getBatchesRegFileName                              | getBatchesRegObjectName | initiateRegFileName                                      | initiateRegObjectName | paymentMethod     | expAction | rail | channel | page | size | search | sort | filter | fromDate | toDate | expectedStatus |
      |      | 2           | 50-100 | BEW_USER | 200        | 200           | 200                  | 200                | Payments-API\\Batch-Payments\\mockUploadBatchFileAPIReg | mockUploadBatchFile | Payments-API\\Batch-Payments\\getFilesAPIREG | getFiles         | Payments-API\\Batch-Payments\\getFileBatchesAPIReg | getFileBatches          | Payments-API\\Batch-Payments\\initiateBatchPaymentAPIReg | initiateBatchPayment  | INTERNAL_TRANSFER | Approve   | INT  | WEB     | 1    | 10   |        |      |        |          |        | In progress    |
