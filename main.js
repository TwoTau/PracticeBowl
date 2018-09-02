const electron = require("electron")
const {app, BrowserWindow, globalShortcut} = electron

require("electron-reload")(__dirname) // for live reload

let mainWindow

function createWindow () {
	const screenWidth = electron.screen.getPrimaryDisplay().size.width

	// Create the browser window and load the index.html of the app
	mainWindow = new BrowserWindow({
		title: "Practice Science Bowl",
		autoHideMenuBar: true,
		frame: false,
		darkTheme: true,
		backgroundColor: "#32373a",
		width: screenWidth,
		height: 500,
		minWidth: 1000,
		minHeight: 400
	})
	mainWindow.loadFile("index.html")

	// remove default shortcuts for refresh and dev tools
	globalShortcut.register('CommandOrControl+R', () => {})
	globalShortcut.register('CommandOrControl+Shift+R', () => {})
	globalShortcut.register('CommandOrControl+Shift+I', () => {})

	// When the window is closed, delete mainWindow
	mainWindow.on("closed", function() {
		mainWindow = null
	})
}

app.on("ready", createWindow)

// Quit when all windows are closed
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		globalShortcut.unregisterAll()
		app.quit()
	}
})

// Recreate the window if dock icon is clicked (for OS X)
app.on("activate", () => {
	if (mainWindow === null) {
		createWindow()
	}
})
