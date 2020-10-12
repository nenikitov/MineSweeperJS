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
            player.isDead = true;
            player.isPlaying = false;
            player.updateGameStatus();
        }
        else {
            this.tileStatus = TileStatus.OPENED;
            if (!mineSweeper.tiles.some( e => !e.isMine && e.tileStatus == TileStatus.UNOPENED)) {
                player.isPlaying = false;
                player.updateGameStatus();
            }
        }
        this.refreshTile();

    }
    flagTile() {
        if (!player.isPlaying) return; // Igone the input if the player is dead
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
        if (this.tileStatus == TileStatus.OPENED && this.minesNear) {
            this.tileElem.innerHTML = this.minesNear;
            this.tileElem.style.color = "#" + this.colorInBetween("A9A9A9", "36AFA7", this.minesNear / 8);
        }
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
    updateGameStatus() {
        var output = document.getElementById("outputConsole");
        if (!this.isPlaying) {
                output.innerText = this.isDead ? "You exploded :(" : "You won :)";
                output.style.color = this.isDead ? "red" : "green";
        }
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
        
        document.getElementById("outputConsole").innerText = "There is total of " + this.numMines + " mines.";

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
        // Clear table
        table.innerHTML = "";

        document.getElementById("outputConsole").style.color = "white";
        document.getElementById("outputConsole").innerText = "Left mouse to open a tile, right mouse to flag it";

        //#region Add children to table
        for (let y = 0; y < this.height; y++) {
            let row = table.insertRow(y);    
            for (let x = 0; x < this.width; x++) {
                let cell = row.insertCell(x);
                let index = (y * this.width + x);
                cell.id = "tile_" + index;
                cell.className = "tile " + TileStatus.UNOPENED;
                cell.setAttribute("onclick","mineSweeper.openTile(" + index + ");");
                cell.setAttribute("oncontextMenu","mineSweeper.tiles[" + index + "].flagTile();return false;");
            }
        }
        //#endregion
    }
    async openTile(cursorCoord) {
        // Generate mines if they are not generated (on first click)
        if (!this.numMines)
                this.generateMines(cursorCoord);

        if (!player.isPlaying) return; // Igone the input if the player is dead

        var tilesToOpen = [cursorCoord];
        while (tilesToOpen.length) {
            var currentTile = tilesToOpen.shift();
            this.tiles[currentTile].openTile();
            if (!this.tiles[currentTile].isMine) { // This is not the bomb
                if (!this.tiles[currentTile].minesNear) { // If there is no mines nearby
                    // Progressive opening animation
                    await delay(1);
                    let validIndexes = this.validIndexesNear(currentTile);
                    for (let i = validIndexes.length; i--;) {
                        if (this.tiles[validIndexes[i]].isMine) continue; // If the tile is mine - skip
                        if (this.tiles[validIndexes[i]].tileStatus == TileStatus.OPENED) continue; // If the tile is opened - skip
                        if (tilesToOpen.includes(validIndexes[i])) continue; // If the tile is already on the list - skip
                        tilesToOpen.push(validIndexes[i]); // If everything is fine - add it to the list
                    } 
                }
            }
        }
    }
    async revealMineTiles() {
        for (let i = this.tiles.length; i--;)
            if (this.tiles[i].isMine)
            {
                this.tiles[i].openTile();
                await delay(200);
            }
                
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
}

function startMineSweeper(width, height, difficulty) { // Create needed classes and initialize variables
    mineSweeper = new MineSweeper(width, height, difficulty);
    player = new Player();
}
function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

/*
* Shout out to Floateresting for his help with dealing with JS.
* Without his explanaitions about some JS quirks and help with debugging,
* I would spend 3x times more sleepless nights to finish this project than I did.
* Visit his github: https://github.com/floateresting
* :)
*/