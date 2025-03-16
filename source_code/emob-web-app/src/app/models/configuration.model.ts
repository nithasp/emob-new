
export interface Configuration {
    inventories:       Inventory[];
    inventoryCategory: InventoryCategory[];
}

export interface Inventory {
    category:  string;
    id:        string;
    name:      string;
    timestamp: Date;
    fileUrl:   FileURL;
}

export interface FileURL {
    fileInventoryUrl: string;
}

export interface InventoryCategory {
    name:     string;
}

export interface Categories {
    name: string;
    timestamp?: string;
    children?: Categories[];
  }
