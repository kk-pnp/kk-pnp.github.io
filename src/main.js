const filters = document.querySelectorAll("[data-filter]");
const cards = document.querySelectorAll("[data-moods]");
const count = document.querySelector("[data-count]");

filters.forEach((button) => {
  button.addEventListener("click", () => {
    const selected = button.dataset.filter;

    filters.forEach((filter) => {
      filter.setAttribute("aria-pressed", String(filter === button));
    });

    let visible = 0;
    cards.forEach((card) => {
      const moods = card.dataset.moods.split(",");
      const show = selected === "all" || moods.includes(selected);
      card.hidden = !show;
      if (show) visible += 1;
    });

    if (count) count.textContent = `${visible} Abenteuer`;
  });
});
