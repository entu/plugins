# Entu Plugins

Collection of plugins for importing data into Entu.

## Available Plugins

### BoardGameGeek Import Plugin (`/bgg`)
Search and import board game data, including box art, from [BoardGameGeek](https://boardgamegeek.com).

| Property | Description |
|---|---|
| `age_min` | Minimum recommended age |
| `artist` | Artist(s) |
| `bgg_id` | BoardGameGeek game ID |
| `category` | Categories |
| `designer` | Designer(s) |
| `max_players` | Maximum player count |
| `mechanic` | Mechanics |
| `min_players` | Minimum player count |
| `name` | Game title |
| `notes` | Game description |
| `photo` | Box art file |
| `playing_time` | Playing time in minutes |
| `publisher` | Publisher(s) (first 5) |
| `year` | Publication year |

### Brickset Import Plugin (`/brickset`)
Search and import LEGO set data, including set images, from [Brickset](https://brickset.com).

| Property | Description |
|---|---|
| `age_max` | Maximum recommended age |
| `age_min` | Minimum recommended age |
| `barcode` | EAN and UPC barcodes |
| `brickset_id` | Set number (e.g. 75192-1) |
| `dimensions` | Box dimensions |
| `minifigs` | Minifig count |
| `name` | Set name |
| `notes` | Set description |
| `photo` | Set image file |
| `pieces` | Piece count |
| `subtheme` | Subtheme |
| `tag` | Tags |
| `theme` | Theme |
| `weight` | Box weight |
| `year` | Release year |

### CSV Import Plugin (`/csv`)
Import data from CSV files with support for multiple encodings.

Imported properties: mapped by the user from CSV columns.

### Discogs Import Plugin (`/discogs`)
Search and import music release data from the [Discogs](https://www.discogs.com) database.

| Property | Description |
|---|---|
| `artist` | Artist name(s) |
| `barcode` | Barcode(s) |
| `catalog_number` | Catalogue number(s) |
| `company` | Production, manufacturing, and distribution companies |
| `country` | Release country |
| `discogs_id` | Discogs release ID |
| `format` | Media format(s) (LP, CD, etc.) |
| `genre` | Genre(s) |
| `label` | Record label(s) |
| `notes` | Release notes |
| `photo` | Cover image file |
| `series` | Series name(s) |
| `series_number` | Series catalogue number(s) |
| `style` | Style(s) |
| `title` | Release title |
| `year` | Release year |

### Ester Import Plugin (`/ester`)
Search and import data from the [ESTER](https://www.ester.ee) library system.

Imported properties depend on the record; the common ones are:

| Property | Description |
|---|---|
| `author` | Author(s) |
| `dimensions` | Physical dimensions |
| `ester_id` | ESTER record ID |
| `isn` | ISBN/ISSN |
| `language` | Language code(s) |
| `name` | Title |
| `notes` | Notes |
| `pages` | Page count |
| `publisher` | Publisher(s) |
| `publishing_date` | Year of publication |
| `publishing_place` | Place of publication |
| `subtitle` | Subtitle |
| `tag` | Subject tags |
| `udc` | UDC classification |

### KML Import Plugin (`/kml`)
Import geographic locations from KML files.

| Property | Description |
|---|---|
| `kirjeldus` | Description |
| `lat` | Latitude |
| `long` | Longitude |
| `name` | Placemark name |
| `pildilingid` | Image links |

### MusicBrainz Import Plugin (`/musicbrainz`)
Search and import music release data, including cover art, from the [MusicBrainz](https://musicbrainz.org) database.

| Property | Description |
|---|---|
| `artist` | Artist name(s) |
| `barcode` | Barcode |
| `catalog_number` | Catalogue number(s) |
| `country` | Release country |
| `format` | Media format(s) (CD, Vinyl, etc.) |
| `genre` | Genre(s) |
| `label` | Record label(s) |
| `language` | Language code |
| `musicbrainz_id` | MusicBrainz release ID |
| `name` | Release title |
| `photo` | Cover art file (from Cover Art Archive) |
| `year` | Release year |

### Open Library Import Plugin (`/openlibrary`)
Search and import book data, including cover images, from the [Open Library](https://openlibrary.org) catalog.

| Property | Description |
|---|---|
| `author` | Author(s) |
| `dimensions` | Physical dimensions |
| `isn` | ISBN-13 and ISBN-10 |
| `language` | Language code(s) |
| `name` | Title |
| `notes` | Edition notes |
| `openlibrary_id` | Open Library edition ID |
| `pages` | Page count |
| `photo` | Cover image file |
| `publisher` | Publisher(s) |
| `publishing_date` | Publication date |
| `publishing_place` | Place of publication |
| `series` | Series |
| `subtitle` | Subtitle |
| `tag` | Subject tags |
| `weight` | Weight |

### Template Import Plugin (`/template`)
Import entity templates and their properties.

Imported properties: copies the selected entity type and its property definitions from the template library.

### TMDB Import Plugin (`/tmdb`)
Search and import movie data, including posters, from [The Movie Database](https://www.themoviedb.org).

| Property | Description |
|---|---|
| `actor` | Actor(s) (top 10) |
| `company` | Production companies |
| `country` | Production countries |
| `director` | Director(s) |
| `genre` | Genre(s) |
| `imdb_id` | IMDb ID |
| `language` | Language code(s) |
| `name` | Title (in the plugin's locale) |
| `notes` | Overview |
| `original_name` | Original title, if it differs |
| `photo` | Poster image file |
| `runtime` | Runtime in minutes |
| `tmdb_id` | TMDB movie ID |
| `year` | Release year |

## Parameters

All plugins use the same parameter structure:

### Required Parameters
- **`account`** - The Entu account where entities will be created
- **`type`** - The entity type/class for new entities
- **`token`** - Bearer token for API authentication

### Optional Parameters
- **`parent`** - Reference ID of parent entity for hierarchical relationships
- **`locale`** - Interface language (supported: 'en', 'et', etc.)

## Usage Examples

```
/bgg?account=games&type=boardgame&token=abc123&locale=en
/brickset?account=lego&type=set&token=abc123&locale=en
/csv?account=myaccount&type=book&token=abc123&parent=library1&locale=et
/discogs?account=musicdb&type=album&token=xyz789&parent=collection1
/ester?account=library&type=book&token=def456&locale=en
/kml?account=myaccount&type=location&token=abc123&parent=map1&locale=et
/musicbrainz?account=musicdb&type=album&token=xyz789&locale=en
/openlibrary?account=library&type=book&token=def456&locale=en
/template?account=myaccount&type=entity&token=abc123&parent=templates&locale=et
/tmdb?account=movies&type=film&token=def456&locale=en
```

## Usage Notes

- All plugins require authentication via the `token` parameter
- All plugins require `account` and `type` parameters to specify where and what to create
- Missing required parameters will display error messages in the interface
- Imported entities can be organized hierarchically using the `parent` parameter

---

Copyright 2026 Entusiastid OÜ. Licensed under the EUPL-1.2 or later.
