(function (window) {

  function initRtmAutocompleteMultiSelect(config) {

    if (!config || !config.fieldName) {
      console.error("rtmAutocompleteMultiSelect: fieldName is required");
      return;
    }

    const FIELD_NAME = config.fieldName;
    const PLACEHOLDER = config.placeholder || "Start typing…";
    const MAX_SUGGESTIONS = config.maxSuggestions || 10;

    const scope = config.scope
      ? document.querySelector(config.scope)
      : document;
  
    if (!scope) {
      console.error("rtmAutocompleteMultiSelect: scope selector not found");
      return;
    }
    
    const observer = new MutationObserver(() => {
      const block = scope.querySelector(
        `.multiOptionSetFormFieldBlock fieldset[name="${FIELD_NAME}"]`
      )?.closest(".multiOptionSetFormFieldBlock");

      if (!block) return;

      observer.disconnect();
      enhance(block);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    function enhance(block) {

      const fieldset = block.querySelector(`fieldset[name="${FIELD_NAME}"]`);
      if (!fieldset) return;

      const labelEl = block.querySelector("label.block-label");
      const labelText = labelEl?.textContent?.trim() || "";

      const checkboxes = Array.from(
        fieldset.querySelectorAll(`input[type="checkbox"][name="${FIELD_NAME}"]`)
      );

      if (!checkboxes.length) return;

      const options = checkboxes.map(cb => ({
        value: cb.value,
        norm: normalize(cb.value),
        checkbox: cb
      }));

      fieldset.style.display = "none";

      const mount = document.createElement("div");
      mount.style.marginTop = "8px";

      mount.innerHTML = `
        <div style="display:flex; flex-wrap:wrap; gap:6px; padding:8px; border:1px solid #ccc; border-radius:6px; min-height:44px;" data-role="tags"></div>
        <div style="position:relative; margin-top:8px;">
          <input type="text"
                 autocomplete="off"
                 placeholder="${escapeAttr(PLACEHOLDER)}"
                 aria-label="${escapeAttr(labelText)}"
                 style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px;"
                 data-role="input" />
          <div data-role="suggestions"
               style="position:absolute; left:0; right:0; z-index:9999; border:1px solid #ddd; border-top:none; background:#fff; display:none; border-radius:0 0 6px 6px;"></div>
        </div>
        <small style="display:block; margin-top:6px; color:#666;">
          Type to search. Enter to add. Click a tag to remove.
        </small>
      `;

      block.insertBefore(mount, fieldset);

      const tagsEl = mount.querySelector('[data-role="tags"]');
      const inputEl = mount.querySelector('[data-role="input"]');
      const suggEl = mount.querySelector('[data-role="suggestions"]');

      renderTags();

      checkboxes.forEach(cb =>
        cb.addEventListener("change", renderTags)
      );

      inputEl.addEventListener("input", () =>
        renderSuggestions(inputEl.value)
      );

      inputEl.addEventListener("keydown", e => {

        if (e.key === "Enter") {
          e.preventDefault();
          const match = findMatch(inputEl.value);
          if (match) {
            setChecked(match.checkbox, true);
            inputEl.value = "";
            hideSuggestions();
            renderTags();
          }
        }

        if (e.key === "Backspace" && inputEl.value === "") {
          const selected = options.filter(o => o.checkbox.checked);
          const last = selected[selected.length - 1];
          if (last) {
            setChecked(last.checkbox, false);
            renderTags();
          }
        }

        if (e.key === "Escape") {
          hideSuggestions();
        }
      });

      document.addEventListener("click", e => {
        if (!mount.contains(e.target)) hideSuggestions();
      });

      function renderTags() {

        const selected = options.filter(o => o.checkbox.checked);

        tagsEl.innerHTML = "";

        if (!selected.length) {
          tagsEl.innerHTML =
            `<div style="color:#777; padding:6px 2px;">No selection</div>`;
          return;
        }

        selected.forEach(o => {
          const chip = document.createElement("button");
          chip.type = "button";
          chip.textContent = o.value;
          chip.style.cssText =
            "border:1px solid #bbb; background:#f7f7f7; border-radius:999px; padding:6px 10px; cursor:pointer;";
          chip.onclick = () => {
            setChecked(o.checkbox, false);
            renderTags();
          };
          tagsEl.appendChild(chip);
        });
      }

      function renderSuggestions(query) {

        const q = normalize(query);
        if (!q) return hideSuggestions();

        const hits = options
          .filter(o => !o.checkbox.checked && o.norm.includes(q))
          .slice(0, MAX_SUGGESTIONS);

        if (!hits.length) return hideSuggestions();

        suggEl.innerHTML = "";

        hits.forEach(h => {
          const row = document.createElement("div");
          row.textContent = h.value;
          row.style.cssText =
            "padding:10px; cursor:pointer; border-top:1px solid #eee;";
          row.onmousedown = e => {
            e.preventDefault();
            setChecked(h.checkbox, true);
            inputEl.value = "";
            hideSuggestions();
            renderTags();
          };
          suggEl.appendChild(row);
        });

        suggEl.style.display = "block";
      }

      function hideSuggestions() {
        suggEl.style.display = "none";
        suggEl.innerHTML = "";
      }

      function findMatch(query) {
        const q = normalize(query);
        if (!q) return null;

        return options.find(o =>
          !o.checkbox.checked &&
          (o.norm === q || o.norm.startsWith(q) || o.norm.includes(q))
        );
      }

      function setChecked(cb, state) {
        if (cb.checked === state) return;
        cb.checked = state;
        cb.dispatchEvent(new Event("change", { bubbles: true }));
      }

      function normalize(s) {
        return (s || "")
          .toString()
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
      }

      function escapeAttr(s) {
        return (s || "").replace(/"/g, "&quot;");
      }
    }
  }

  // expose global
  window.rtmAutocompleteMultiSelect = initRtmAutocompleteMultiSelect;

})(window);
