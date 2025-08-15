
export interface Configuration {
    category: string;
    type: string;
    id: string;
    name: string;
    timestamp: Date;
    fileUrl: FileURL;
    depotId: string;
    fileBlobPath: string;
    columns: string[];
    depot: Depot;
}
export interface ActualLocation {
    year: string;
    children: ActualLocationYearChildren[]
}

interface ActualLocationYearChildren {
    month: string;
    children: ActualLocationMonthChildren[]
}
interface ActualLocationMonthChildren {
    fileName: string;
    timestamp: Date;
    fileBlobPath: string;
    fileUrl: FileActualLocationURL
}
export interface FileActualLocationURL {
    fileActualLocationUrl: string;
}
export interface FileURL {
    fileConfigurationUrl: string;
}


export interface Categories {
    name: string;
    timestamp?: string;
    type?: string;
    blobPath?: string;
    children?: Categories[];
}

interface Depot {
    companyName: string;
    depotId: string;
    depotName: string;
    latitude: number;
    longitude: number;
    tw_early: string;
    tw_late: string;
    createdAt: Date;
    updatedAt: Date;
    inputdata: InputData[];
}

interface InputData {
    companyName: string;
    depotId: string;
    keyName: string;
    displayName: string;
    columnRequired: string[];
    fileFormatType: string;
    createdAt: Date;
    modifiedAt: Date;
}
