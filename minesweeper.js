const TileStatus = {
    UNOPENED: "unopenedTile",
    OPENED: "openedTile",
    FLAGGED: "flaggedTile",
    QUESTIONED: "questionedTile",
    MINE: "mineTile"
}

class Tile {
    constructor(index) {
        this.tileStatus = TileStatus.UNOPENED;
        this.isMine = false;
        this.minesNear = 0;
        this.tileElem = document.getElementById("tile_" + index);
    }
    openTile() {
        if (this.isMine) {
            this.tileStatus = TileStatus.MINE;
          //player.isDead = true;
          //player.isPlaying = false;
        }
        else {
            this.tileStatus = TileStatus.OPENED;
            this.tileElem.innerHTML = this.minesNear;
            this.tileElem.style.color = "#" + this.colorInBetween("A9A9A9", "36AFA7", this.minesNear / 8);
        }
        this.refreshTile();
    }
    flagTile() {
        switch (this.tileStatus) {
            case TileStatus.UNOPENED:
                this.tileStatus = TileStatus.FLAGGED;
                break;
            case TileStatus.FLAGGED:
                this.tileStatus = TileStatus.QUESTIONED;
                break;
            case TileStatus.QUESTIONED:
                this.tileStatus = TileStatus.UNOPENED;
                break;
        }
        this.refreshTile();
    }
    refreshTile() {
        this.tileElem.className = "tile " + this.tileStatus;
    }
    colorInBetween(col1, col2, blend) {
        /* This methond should return the blended color in between 2 colors,
        *  but its bugged. I fixed it but I prefer this result more than the
        *  fixed one. I came looking for copper and found gold. */ 
        col1 = parseInt(col1, 16);
        col2 = parseInt(col2, 16);

        var newColor = Math.round(col1 + (col2 - col1) * blend);
        return newColor.toString(16);
    }
}
class Player {
    constructor() {
        this.isDead = false;
        this.isPlaying = true;
        this.cursorPosition = 0;
    }
}
class MineSweeper {
    constructor(width, height, difficulty) {
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;
        this.pattern =  [-this.width - 1, -this.width, -this.width + 1, -1, 1, this.width - 1, this.width, this.width + 1,];

        this.drawField();

        //#region Generate the tiles array
        this.tiles = [];
        for (let i = 0; i < this.height * this.width; i++)
            this.tiles.push(new Tile(i));
        //#endregion
    }

    generateMines(cursorCoord) {
        this.numMines = Math.floor(this.height * this.width * this.difficulty);
        
        var mineIndexes = Array.from({length: this.height * this.width}, (v, k) => k); // Generate an array of all indexes
        mineIndexes.splice(mineIndexes.indexOf(cursorCoord), 1); // Remove the index of hovered tile
        
        //#region Shuffle mine indexes array
        for (let i = mineIndexes.length; i--;) {
            let j = Math.floor(Math.random() * mineIndexes.length);
            [mineIndexes[i], mineIndexes[j]] = [mineIndexes[j], mineIndexes[i]];
        }
        //#endregion

        // Set isMine for the needed ammount of tiles
        for (let i = 0; i < this.numMines; i++)
            this.tiles[mineIndexes[i]].isMine = true;

        //#region Calculate minesNear
        for (let i = this.tiles.length; i--;) {
            var minesNear = 0;
            this.validIndexesNear(i).forEach(e => minesNear += this.tiles[e].isMine);
            this.tiles[i].minesNear = minesNear;
        }
        //#endregion
    }
    drawField() {
        var table = document.getElementById("mineField");
        table.setAttribute("onmouseout","selectedTile = -1;");

        //#region Add children to table
        for (let y = 0; y < this.height; y++) {
            let row = table.insertRow(y);    
            for (let x = 0; x < this.width; x++) {
                let cell = row.insertCell(x);
                let index = (y * this.width + x);
                cell.id = "tile_" + index;
                cell.className = "tile " + TileStatus.UNOPENED;
                cell.setAttribute("onmouseover","selectedTile = " + index + ";");
            }
        }
        //#endregion
    }
    validIndexesNear(index) {
        var validIndexes = [];

        for (let i = this.pattern.length; i--;) {
            let delta = this.pattern[i];
            if (!(index % this.width) && !((index + delta + 1) % this.width)) // If index is on the left and pattern index is on the right side
                continue;
            if (!((index + 1) % this.width) && !((index + delta) % this.width)) // If index is on the right and pattern index is on the left side
                continue;
            if ((index + delta < 0) || (index + delta > this.width * this.height - 1)) // If index is outside the range
                continue;
            validIndexes.push(index + delta);
        }
        return validIndexes;
    }
    async openTile(cursorCoord) {
        var tilesToOpen = [cursorCoord];
        while (tilesToOpen.length) {
            var currentTile = tilesToOpen.shift();
            this.tiles[currentTile].openTile();

            if (!this.tiles[currentTile].isMine) { // This is not the bomb
                this.tiles[currentTile].openTile();
                if (!this.tiles[currentTile].minesNear) { // If there is no mines nearby
                    // Progressive opening animation
                    await delay(1);
                    let validIndexes = this.validIndexesNear(currentTile);
                    for (let i = validIndexes.length; i--;) {
                        if (!this.tiles[validIndexes[i]].isMine && this.tiles[validIndexes[i]].tileStatus != TileStatus.OPENED)
                            tilesToOpen.push(validIndexes[i]);    
                    } 
                }
            }
        }
    }
}

function startMineSweeper(width, height, difficulty) { // Create needed classes and initialize variables
    mineSweeper = new MineSweeper(width, height, difficulty);
    player = new Player();
    selectedTile = -1;
}
function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

document.addEventListener('keydown', function(event) { // Event listener for opening and flagging selected tile
    if (typeof player !== "undefined") {
        if (player.isPlaying) {
            switch(event.key) {
                case "z": // Open tile
                    if (selectedTile + 1)
                    {
                        if (!mineSweeper.numMines)
                            mineSweeper.generateMines(selectedTile);
                        mineSweeper.openTile(selectedTile);
                    }
                    break;
                case "x": // Flag Tile
                    if (selectedTile + 1)
                        mineSweeper.tiles[selectedTile].flagTile();
                    break;
            }
        }
    }
});