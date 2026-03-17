import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import MixinStorage "blob-storage/Mixin";
import MixinAuthorization "authorization/MixinAuthorization";
import Storage "blob-storage/Storage";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  type BookId = Text;

  type BookMetadata = {
    id : BookId;
    title : Text;
    author : Text;
    fileType : FileType;
    uploadTime : Time.Time;
    fileSize : Nat;
    filePath : Text;
  };

  module BookMetadata {
    public func compare(b1 : BookMetadata, b2 : BookMetadata) : Order.Order {
      switch (Text.compare(b1.title, b2.title)) {
        case (#equal) { Text.compare(b1.author, b2.author) };
        case (order) { order };
      };
    };
  };

  type ReadingProgress = {
    bookId : BookId;
    chapterIndex : Nat;
    charOffset : Nat;
    percentageComplete : Float;
  };

  type FileType = {
    #epub;
    #pdf;
    #txt;
  };

  public type UserProfile = {
    name : Text;
  };

  let bookMetadataMap = Map.empty<BookId, BookMetadata>();
  let userBooksMap = Map.empty<Principal, Set.Set<BookId>>();
  let userProgressMap = Map.empty<Principal, Map.Map<BookId, ReadingProgress>>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  func getUserBooksSet(user : Principal) : Set.Set<BookId> {
    switch (userBooksMap.get(user)) {
      case (null) {
        let newSet = Set.empty<BookId>();
        userBooksMap.add(user, newSet);
        newSet;
      };
      case (?books) { books };
    };
  };

  // User profile functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Book management functions
  public shared ({ caller }) func addBook(book : BookMetadata) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add books");
    };

    let bookId = book.id;
    bookMetadataMap.add(bookId, book);

    let userBooks = getUserBooksSet(caller);
    userBooks.add(bookId);
    userBooksMap.add(caller, userBooks);
  };

  public shared ({ caller }) func deleteBook(bookId : BookId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete books");
    };

    switch (bookMetadataMap.get(bookId)) {
      case (null) { Runtime.trap("Book not found") };
      case (?book) {
        // Check ownership: only the owner or admin can delete
        let userBooks = getUserBooksSet(caller);
        let isOwner = userBooks.contains(bookId);
        let isAdmin = AccessControl.isAdmin(accessControlState, caller);
        
        if (not isOwner and not isAdmin) {
          Runtime.trap("Unauthorized: Can only delete your own books");
        };

        bookMetadataMap.remove(bookId);
        userBooks.remove(bookId);
        userBooksMap.add(caller, userBooks);

        // Clean up progress for this book across all users
        userProgressMap.forEach(func(_, progressMap) { progressMap.remove(bookId) });
      };
    };
  };

  public query ({ caller }) func getUserLibrary() : async [BookMetadata] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their library");
    };

    let bookIdsArray = getUserBooksSet(caller).toArray();
    bookIdsArray.map(
      func(id) {
        switch (bookMetadataMap.get(id)) {
          case (null) { Runtime.trap("Book metadata not found") };
          case (?metadata) { metadata };
        };
      }
    ).sort();
  };

  public shared ({ caller }) func saveReadingProgress(progress : ReadingProgress) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save reading progress");
    };

    // Verify the user owns this book
    let userBooks = getUserBooksSet(caller);
    if (not userBooks.contains(progress.bookId)) {
      Runtime.trap("Unauthorized: Can only save progress for your own books");
    };

    let currentProgress = switch (userProgressMap.get(caller)) {
      case (null) {
        let newMap = Map.empty<BookId, ReadingProgress>();
        userProgressMap.add(caller, newMap);
        newMap;
      };
      case (?map) { map };
    };

    currentProgress.add(progress.bookId, progress);
  };

  public query ({ caller }) func getReadingProgress(bookId : BookId) : async ?ReadingProgress {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view reading progress");
    };

    switch (userProgressMap.get(caller)) {
      case (null) { null };
      case (?progressMap) { progressMap.get(bookId) };
    };
  };

  public query ({ caller }) func getAllBooks() : async [BookMetadata] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all books");
    };

    bookMetadataMap.values().toArray().sort();
  };

  public query ({ caller }) func getUserAllProgress() : async [ReadingProgress] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their progress");
    };

    switch (userProgressMap.get(caller)) {
      case (null) { [] };
      case (?progressMap) {
        progressMap.values().toArray();
      };
    };
  };
};
