import { LightningElement, wire, track, api } from 'lwc';
import retrieveBlobFromAzureBlobStorage from '@salesforce/apex/AzureBlobStorageController.retrieveBlobFromAzureBlobStorage';
import getCustomAttachments from '@salesforce/apex/AzureBlobStorageController.getCustomAttachments';

const columns = [
    { label: 'Gems Case Reference', fieldName: 'CaseReference__c' },
    { label: 'Document Type', fieldName: 'DocumentType__c' },
    { label: 'Filename', fieldName: 'FileName__c' },
    { label: 'Open', type: 'button', initialWidth: 150, typeAttributes: { 
            label: 'Open File', 
            name: 'OpenFile', 
            title: 'OpenFile', 
            value: 'Open File', 
            iconName: 'utility:download', 
            iconPosition: 'left', 
            disabled: false
        } 
    }
];

export default class ListCustomAttachments extends LightningElement {

    // Gets the unique identifier of the current record
    @api recordId;

    @track fileContents;

    columns = columns;

    // Calls the getCustomAttachments method of the AzureBlobStorageController Apex class
    // and wires the result to the customAttachments variable (used in listCustomAttachments.html)
    @wire(getCustomAttachments, { uniqueId: '$recordId' }) customAttachments;

    /**
     * Handles row action events, of which we only trigger 'OpenFile'
     * @param event An instance of an Event
     */
    handleRowAction(event) {

        const actionName = event.detail.action.name;
        const row = event.detail.row;

        switch (actionName) {

            case 'OpenFile':

                this.getFile(
                    row.CaseReference__c,
                    row.DocumentType__c,
                    row.FileName__c
                );

                break;

            default:

        }

    }

    /**
     * Retrieves file contents from Salesforce Apex REST API
     * @param caseId GEMS Case ID
     * @param documentType Type of document
     * @param fileName Filename
     */
    getFile(caseId, documentType, fileName) {
        retrieveBlobFromAzureBlobStorage({ caseId: caseId, documentType: documentType, fileName: fileName })
            .then(result => {

                this.fileContents = result;

                const downloadLink = document.createElement('a');

                document.body.appendChild(downloadLink);

                downloadLink.href = 'data:text/plain;base64,' + this.fileContents;

                downloadLink.target = '_self';

                downloadLink.download = fileName;

                downloadLink.click();

            });
    }

}
