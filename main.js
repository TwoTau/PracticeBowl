const {app, BrowserWindow} = require("electron")

require("electron-reload")(__dirname) // for live reload

let mainWindow

function createWindow () {
	// Create the browser window and load the index.html of the app
	mainWindow = new BrowserWindow({
		title: "Practice Science Bowl",
		autoHideMenuBar: true,
		darkTheme: true,
		backgroundColor: "#32373a",
		width: 1000,
		height: 600,
		minWidth: 950,
		minHeight: 600
	})
	// mainWindow.setMenu(null)
	mainWindow.loadFile("index.html")

	// When the window is closed, delete mainWindow
	mainWindow.on("closed", function() {
		mainWindow = null
	})
}

app.on("ready", createWindow)

// Quit when all windows are closed
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit()
	}
})

// Recreate the window if dock icon is clicked (for OS X)
app.on("activate", () => {
	if (mainWindow === null) {
		createWindow()
	}
})
