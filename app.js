import PianoRoll from "./pianoroll.js";

class PianoRollDisplay {
  constructor(csvURL) {
    this.csvURL = csvURL;
    this.data = null;
  }

  async loadPianoRollData() {
    try {
      const response = await fetch("https://pianoroll.ai/random_notes");
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      this.data = await response.json();
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

  preparePianoRollCard(rollId) {
    const cardDiv = document.createElement("div");
    cardDiv.classList.add("piano-roll-card");

    // Create and append other elements to the card container as needed
    const descriptionDiv = document.createElement("div");
    descriptionDiv.classList.add("description");
    descriptionDiv.textContent = `${rollId}`;
    cardDiv.appendChild(descriptionDiv);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("piano-roll-svg");
    svg.setAttribute("width", "80%");
    svg.setAttribute("height", "150");

    // Append the SVG to the card container
    cardDiv.appendChild(svg);

    return { cardDiv, svg };
  }

  async generateSVGs() {
    if (!this.data) await this.loadPianoRollData();
    if (!this.data) return;

    const pianoRollContainer = document.getElementById("pianoRollContainer");
    pianoRollContainer.innerHTML = "";
    for (let it = 0; it < 20; it++) {
      const start = it * 60;
      const end = start + 60;
      const partData = this.data.slice(start, end);

      const { cardDiv, svg } = this.preparePianoRollCard(it);

      pianoRollContainer.appendChild(cardDiv);
      const roll = new PianoRoll(svg, partData);
    }
  }
}
document.getElementById("loadCSV").addEventListener("click", async () => {
  const csvToSVG = new PianoRollDisplay();
  await csvToSVG.generateSVGs();
  MainView();
});

function MainView() {
  let previousClickedCardIndex = null;
  const cards = document.querySelectorAll(".piano-roll-card");
  const pianoRollContainer = document.getElementById("pianoRollContainer");
  // Add a click event listener to each card
  cards.forEach((card, index) => {
    card.addEventListener("click", (event) => {
      if (index !== previousClickedCardIndex) {
        event.stopPropagation();
        // Remove the id from the previously clicked card
        if (previousClickedCardIndex !== null) {
          const previousClickedCard = cards[previousClickedCardIndex];
          previousClickedCard.removeAttribute("id");
        }
        //add a card-not-clicked id to all the rest of cards which are not clicked
        cards.forEach((otherCard) => {
          if (otherCard !== card) {
            otherCard.id = "card-not-clicked";
          }
        });

        // Set a unique id card-clicked for the clicked card
        card.id = "card-clicked";
        manageSelection();
        //change the pianoRollContainer from pianoRollContainer to pianoRollContainer-flex with other css style (Main View)
        pianoRollContainer.removeAttribute("id");
        pianoRollContainer.id = "pianoRollContainer-flex";

        // Update the previously clicked card's index
        previousClickedCardIndex = index;

        // Scroll to the top of the page
        document.documentElement.scrollTop = 0; // For modern browsers
        document.body.scrollTop = 0; // For older browsers
      }
    });
  });
}

function manageSelection() {
  const x = document.getElementById("card-clicked");
  if (x) {
    const svg = x.querySelector("svg");
    let isDragging = false;
    let startX;
    let allSelections = [];
    let closeIconIDCount = 0;

    let selection = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    let noteCountText = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );

    // Add a mouse-down event listener to record the starting point
    svg.addEventListener("mousedown", (e) => {
      isDragging = true;
      const svgRect = svg.getBoundingClientRect();
      startX = (e.clientX - svgRect.left) / svgRect.width;
    });

    // Add a mouse-move event listener to create a selection while dragging or create a mouse vertical guideline when moving without dragging.
    svg.addEventListener("mousemove", (e) => {
      const svgRect = svg.getBoundingClientRect();
      const mouseX = (e.clientX - svgRect.left) / svgRect.width;

      if (isDragging) {
        // Create a <rect> element for the background while dragging
        selection.setAttribute("x", mouseX < startX ? mouseX : startX);
        selection.setAttribute("y", 0);
        selection.setAttribute("width", Math.abs(mouseX - startX));
        selection.setAttribute("height", 1);
        selection.setAttribute("fill", "RGB(255, 247, 204,0.5)");
        selection.setAttribute("stroke", "RGB(204,204,0)");
        selection.setAttribute("stroke-width", "0.002");
        selection.setAttribute("id", "backgroundRect");

        // Create a noteCountText element for displying the number of Notes
        noteCountText.setAttribute("x", mouseX < startX ? mouseX : startX); // X-coordinate
        noteCountText.setAttribute("y", "0.95"); // Y-coordinate
        noteCountText.setAttribute("font-family", "Arial");
        noteCountText.setAttribute("font-size", "0.03");
        noteCountText.setAttribute("fill", "wellow");
        noteCountText.setAttribute("font-weight", "bold");
        noteCountText.setAttribute("id", "NotesCount");

        // Count the notes number within the selection if the start of the Note included in the selection then count+1, thia is what I get from the discord ansower.
        let count = countingNotes(svg, startX, mouseX);

        noteCountText.textContent = `Notes: ${count}`;

        //append the selection and the notes text to the SVG
        svg.appendChild(selection);
        svg.appendChild(noteCountText);
      } else {
        // In this else, I'm checking if the mouse is inside one of the selections, then omit the vertical guideline until the mouse moves out of the selection.
        let mouseXFound = false;
        if (allSelections.length != 0) {
          allSelections.forEach((group) => {
            // Find the rect element within the group
            const rect = group.querySelector("rect");

            if (rect) {
              // Get the x and width attributes of the selection to calculat endX which is the end boundry of the selection to check after that if the mouse inside the interval selection x and endx
              var x = parseFloat(rect.getAttribute("x"));
              var width = parseFloat(rect.getAttribute("width"));
              const endX = x + width;

              // Check if mouseX is within the selection
              if (mouseX >= x && mouseX <= endX) {
                mouseXFound = true;
                // Exit the loop
                return;
              }
            }
          });
          if (!mouseXFound) {
            drawMouseVerticalGuideline(svg, mouseX);
          }
        } else {
          drawMouseVerticalGuideline(svg, mouseX);
        }
      }
    });

    // Add a mouse-up event listener to stop dragging and apply the creation of a selection with a deletion button for the selection in the top and a text at the bottom of the selection to display the number of notes inside the selection.
    svg.addEventListener("mouseup", (e) => {
      isDragging = false;
      if (selection && selection.parentNode === svg) {
        svg.removeChild(selection);
        svg.removeChild(noteCountText);
      }
      const svgRect = svg.getBoundingClientRect();
      const mouseX = (e.clientX - svgRect.left) / svgRect.width;
      const clonedselection = selection.cloneNode(true);
      const notesNumber = noteCountText.cloneNode(true);
      // logging the start and the end points of the selection
      console.log(
        `The selection start point is: ${startX}, and The selection end point is:${mouseX} `
      );
      if (startX !== mouseX) {
        // When the initial click position (startX) is different from the mouseX coordinate when the mouseUp event triggered, I have created a group of elements and appended to it the selection, closeIcon, and the notesNumber.
        const rectX = parseFloat(clonedselection.getAttribute("x"));
        const rectWidth = parseFloat(clonedselection.getAttribute("width"));
        const NotesCount = notesNumber.textContent;
        console.log({ NotesCount });
        // Calculate the x-position for the closeIcon element
        const xCoordinate = rectX + rectWidth - 0.05;
        //Create the closeIcon element
        const closeIcon = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "image"
        );

        // Set the image source, dimensions, and position
        closeIcon.setAttribute("x", xCoordinate); // X-coordinate
        closeIcon.setAttribute("y", "0.01"); // Y-coordinate
        closeIcon.setAttribute("width", "0.05");
        closeIcon.setAttribute("height", "0.05");
        closeIcon.setAttribute("href", "assets/window-close.png");
        closeIcon.setAttribute("id", `${closeIconIDCount}`);

        //Create the group element to append to it the selection, closeIcon, notesNumber text. and after that append the group to the SVG
        const group = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "g"
        );
        group.appendChild(clonedselection);
        group.appendChild(closeIcon);
        group.appendChild(notesNumber);
        allSelections.push(group);
        allSelections.forEach((group) => {
          svg.appendChild(group);
        });
        closeIconIDCount++;
      }
    });

    // Add the event listener for clicking on closeIcone to delete the group which contains the selection, closeIcon, notesNumber text.
    svg.addEventListener("click", (event) => {
      const target = event.target;
      if (target.nodeName === "image") {
        // This code will execute when a closeIcon is clicked
        const clickedImageID = target.getAttribute("id");

        // Find and remove the corresponding group
        const groupToRemove = allSelections.find((group) => {
          return group.querySelector(`[id="${clickedImageID}"]`) !== null;
        });

        if (groupToRemove) {
          // Remove the group from the SVG
          svg.removeChild(groupToRemove);

          // Remove the group from the allSelections array
          const groupIndex = allSelections.indexOf(groupToRemove);
          if (groupIndex !== -1) {
            allSelections.splice(groupIndex, 1);
          }
        }
      }
    });
  }
}

function countingNotes(svg, startX, mouseX) {
  const rects = svg.querySelectorAll("rect");
  let count = -2;
  rects.forEach((existingRect) => {
    const x = parseFloat(existingRect.getAttribute("x"));
    if (x >= startX && x <= mouseX && mouseX > startX) {
      count++;
    } else if (x <= startX && x >= mouseX && mouseX < startX) {
      count++;
    }
  });
  return count;
}

function drawMouseVerticalGuideline(svg, mouseX) {
  // Create a vertical guide line for the mouse while moving
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", mouseX);
  rect.setAttribute("y", 0);
  rect.setAttribute("width", 0.001677823222704505);
  rect.setAttribute("height", 1);
  rect.setAttribute("fill", "rgba(0, 0, 0 ,0.7)");
  rect.setAttribute("id", "backgroundRectMovment");

  // Remove any existing vertical guide line
  const existingBackgroundRects = svg.querySelectorAll(
    "#backgroundRectMovment"
  );
  existingBackgroundRects.forEach((existingRect) => {
    svg.removeChild(existingRect);
  });

  // Append the vertical guide line to the SVG
  svg.appendChild(rect);
}
