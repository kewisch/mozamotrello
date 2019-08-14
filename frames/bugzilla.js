const SHOW_BUG_PREFIX = "https://bugzilla.mozilla.org/show_bug.cgi?id=";

var t = window.TrelloPowerUp.iframe();

t.render(() => {
  t.card("attachments")
    .get("attachments")
    .filter(attachment => attachment.url.startsWith(SHOW_BUG_PREFIX))
    .then((attachments) => {
      document.querySelector("#content").innerHTML = "";
      document.querySelector("#loading").classList.add("loading");
      let attachbugs = {};
      for (let attachment of attachments) {
        let id = attachment.url.substr(45);
        attachbugs[id] = attachment;
      }

      let bugs = Object.keys(attachbugs);
      return fetch("https://bugzilla.mozilla.org/rest/bug?id=" + bugs.join(","))
        .then(resp => resp.json())
        .then((json) => [attachbugs, json]);
    }).then(([attachbugs, json]) => {
      document.querySelector("#loading").classList.remove("loading");

      for (let bug of json.bugs) {
        let template = document.querySelector("#bug");
        let clone = document.importNode(template.content, true);
        let attachment = attachbugs[bug.id];

        clone.querySelector(".id").textContent = bug.id;
        clone.querySelector(".url").setAttribute("href", SHOW_BUG_PREFIX + bug.id);

        let status = clone.querySelector(".status");
        if (bug.status == "RESOLVED") {
          status.textContent = bug.resolution;
        } else if (bug.status == "VERIFIED") {
          status.textContent = bug.status + " " + bug.resolution;
        } else {
          status.textContent = bug.status;
        }

        let assigned_to = clone.querySelector(".assigned_to");
        assigned_to.textContent = bug.assigned_to_detail.nick || bug.assigned_to_detail.real_name;
        assigned_to.setAttribute("title", bug.assigned_to_detail.real_name);
        if (bug.assigned_to_detail.email != "nobody@mozilla.org") {
          assigned_to.setAttribute("href", "mailto:" + encodeURIComponent(bug.assigned_to_detail.email));
        }


        let priority = clone.querySelector(".priority");
        if (bug.priority == "--") {
          priority.textContent = "Unprioritized";
          priority.classList.add("unprioritized");
        } else {
          priority.textContent = bug.priority;
        }

        if (bug.target_milestone != "---") {
          clone.querySelector(".target_milestone").textContent = bug.target_milestone;
        }

        clone.querySelector(".summary").textContent = bug.summary;
        clone.querySelector(".trello_description").textContent = attachment.name || "";

        document.querySelector("#content").appendChild(clone);
      }
    }).then(() => {
      return t.sizeTo("#content");
    }).catch((err) => {
      console.error(err);
    });
});
