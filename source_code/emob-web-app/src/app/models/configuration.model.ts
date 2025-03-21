
export interface Configuration {
    category:  string;
    type:string;
    id:        string;
    name:      string;
    timestamp: Date;
    fileUrl:   FileURL;
}
export interface ActualLocation {
    year: string;
    children: ActualLocationYearChildren[]
}

interface ActualLocationYearChildren{
    month: string;
    children: ActualLocationMonthChildren[]
}
interface ActualLocationMonthChildren{
    fileName:string;
    timestamp: Date;
    fileBlobPath: string;
    fileUrl: FileActualLocationURL
}
export interface FileActualLocationURL {
    fileActualLocationUrl:string;
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
