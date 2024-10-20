let skip = 0;
window.onload = generateTodos();

function generateTodos() {
  axios
    .get(`/read-item/?skip=${skip}`)
    .then((res) => {
      if (res.data.status !== 200) {
        alert(res.data.message);
        return;
      }
      const todos = res.data.data;
      console.log(todos);
      skip += todos.length;

      document.getElementById("item_list").insertAdjacentHTML(
        "beforeend",

        todos.map((item) => {
          return `
        <li>
        <span class="item-text">${item.todo}</span>
        <div class="buttons">
            <button data-id="${item._id}" class="edit-me">Edit</button>
            <button data-id="${item._id}" class="delete-me">Delete</button>
        </div>
         </li>
            `;
        })
      );
    })
    .catch((err) => console.log(err));
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("edit-me")) {
    const newData = prompt("Enter new todo text");
    const todoId = e.target.getAttribute("data-id");

    axios
      .post("/edit-item", { newData, todoId })
      .then((res) => {
        if (res.data.status !== 200) {
          alert(res.data.message);
          return;
        }
        e.target.parentElement.parentElement.querySelector(
          ".item-text"
        ).innerHTML = newData;
      })
      .catch((err) => console.log(err));
  } else if (e.target.classList.contains("delete-me")) {
    const todoId = e.target.getAttribute("data-id");

    axios
      .post("/delete-item", { todoId })
      .then((res) => {
        if (res.data.status !== 200) {
          alert(res.data.message);
          return;
        }
        e.target.parentElement.parentElement.remove();
      })
      .catch((err) => console.log(err));
  } else if (e.target.classList.contains("add_item")) {
    const todo = document.getElementById("create_field").value;

    axios
      .post("/create-item", { todo })
      .then((res) => {
        if (res.data.status !== 201) {
          alert(res.data.message);
          return;
        }
        const { todoDb } = res.data.data;
        console.log(res.data);
        document.getElementById("create_field").value = "";

        document.getElementById("item_list").insertAdjacentHTML(
          "beforeend",

          `<li>
            <span class="item-text">${todoDb.todo}</span>
            <div class="buttons">
              <button data-id="${todoDb._id}" class="edit-me">
                Edit
              </button>
              <button data-id="${todoDb._id}" class="delete-me">
                Delete
              </button>
            </div>
          </li>`
        );
      })
      .catch((err) => console.log(err));
  } else if (e.target.classList.contains("show_more")) {
    console.log("clicked");
    generateTodos();
  }
});
