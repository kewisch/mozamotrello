# AMO Trello Companion
This is a Trello PowerUp that:
* Shows an attachment section for attached Bugzilla links, displaying their status 
* Provides a list sorter that sorts by Firefox version and quarter
* Provides an URL formatter that formats bugzilla links with the bug number
* Adds a card detail badge for each Firefox label, that shows calculated release dates


## Usage
This PowerUp is tailored for the needs of the AMO PM team. In theory anyone could use it, but you should be using the following labels:
* FF68 - Labels for Firefox releases
* Q3 - Labels for the quarter you'd like to work on it

To install:
* Head to the [Trello PowerUp Admin](https://trello.com/power-ups/admin)
* Click on the team you'd like to add this to
* Give the PowerUp a name and give it the following capabilities:
  * `attachment-sections`
  * `card-detail-badges`
  * `format-url`
  * `list-sorters`
* Point the Iframe connector URL to where this is hosted
