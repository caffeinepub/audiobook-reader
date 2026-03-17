import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type BookId = string;
export type Time = bigint;
export interface ReadingProgress {
    chapterIndex: bigint;
    percentageComplete: number;
    bookId: BookId;
    charOffset: bigint;
}
export interface BookMetadata {
    id: BookId;
    title: string;
    filePath: string;
    fileSize: bigint;
    fileType: FileType;
    author: string;
    uploadTime: Time;
}
export interface UserProfile {
    name: string;
}
export enum FileType {
    pdf = "pdf",
    txt = "txt",
    epub = "epub"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addBook(book: BookMetadata): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteBook(bookId: BookId): Promise<void>;
    getAllBooks(): Promise<Array<BookMetadata>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getReadingProgress(bookId: BookId): Promise<ReadingProgress | null>;
    getUserAllProgress(): Promise<Array<ReadingProgress>>;
    getUserLibrary(): Promise<Array<BookMetadata>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveReadingProgress(progress: ReadingProgress): Promise<void>;
}
