// Folder service types and interfaces

export interface Folder {
  id: string;
  userId: string;
  tenantId: string;
  taxonomyId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFolderRequest {
  taxonomyId: string;
  name: string;
}

export interface CreateFolderResponse {
  success: boolean;
  message: string;
  folder?: Folder;
}

export interface ListFoldersResponse {
  success: boolean;
  message: string;
  folders?: Folder[];
}

export interface UpdateFolderRequest {
  name: string;
}

export interface UpdateFolderResponse {
  success: boolean;
  message: string;
  folder?: Folder;
}

export interface DeleteFolderResponse {
  success: boolean;
  message: string;
}

