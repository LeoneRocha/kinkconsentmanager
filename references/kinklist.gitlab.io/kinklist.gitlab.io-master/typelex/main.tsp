import "@typelex/emitter";
import "./externals.tsp";

namespace io.gitlab.kinklist.kinklist.list {
  /** A shared kink list */
  @rec("tid")
  model Main {
    /** Array of kink category/section definitions */
    @required kinkDefinitions: io.gitlab.kinklist.kinklist.profile.KinkCategory[];

    /** When this list was created */
    @required createdAt: datetime;
  }
}

namespace io.gitlab.kinklist.kinklist.profile {
  /** My kink list profile. */
  @rec("literal:self")
  model Main {
    /** Array of kink category/section definitions */
    kinkDefinitions?: KinkCategory[];

    /** Array of kink preferences */
    @required kinks: KinkEntry[];

    /** When this profile was created */
    @required createdAt: datetime;

    /** When this profile was last updated */
    @required updatedAt: datetime;
  }

  /** A category/section definition of kinks, containing multiple kink entries */
  model KinkCategory {
    /** The category/section name (e.g., "General", "Taboo", "Bodies") */
    @required name: string;

    /** Description of the category/section (e.g., "General kinks", "Taboo kinks", "Bodies kinks") */
    description?: string;

    /** Array of kink definitions */
    @required kinks: KinkDefinition[];

    /** Array of participant types (e.g., "Self", "Partner", "Giving", "Receiving") */
    @required participants: string[];
  }

  /** A single kink definition within a category, describing the kink and its possible preferences */
  model KinkDefinition {
    /** The name of the kink (e.g., "Bondage", "Voyeurism") */
    @required name: string;

    /** Description of the kink (e.g., "Restraining or being restrained", "Watching others engage in sexual activities") */
    description?: string;
  }

  /** A single kink entry with preferences */
  model KinkEntry {
    /** The category/section this kink belongs to (e.g., "General", "Taboo", "Bodies") */
    @required section: string;

    /** The name of the kink (e.g., "Bondage", "Voyeurism") */
    @required name: string;

    /** The participant type (e.g., "Self", "Partner", "Giving", "Receiving") */
    @required participant: string;

    /** The preference choice for this kink */
    @required choice: Choice;
  }

  /** Closed enum of preference choices */
  @closed
  @inline
  union Choice {
    /** Favorite - highly desired */
    "favorite",

    /** Like - enjoyed */
    "like",

    /** Okay - neutral/acceptable */
    "okay",

    /** Maybe - uncertain/depends */
    "maybe",

    /** No - not interested */
    "no",

    /** Not entered - no preference given */
    "not-entered",

    /** Want to try - interested but not yet experienced */
    "want-to-try"
  }
}