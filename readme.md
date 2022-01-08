The polyfill is added to support IE11.

# Updates

The first update was from an older version to 1.5.3 because minification did not work on the older version.

## 2021-12-12

The 1.5.3 version works fine however, when dynamically updating data, the legend is not updated and an exception appears on the console.

I tested the latest version in 1.x branch: 1.6.2 and the latest rc of the still new 2.x branch (20).
Both work with dynamically updating legends, however there seems to be a styling bug introduced around 1.6.0, at least for pie charts.
The popup window is styled incorrectly.

So currently tested release 1.6.0 of javascript with 1.5.8 of css which seems to have an updateable legend and correct styling.

We need the UMD release which is the "universal" release with iife. Other releases require specific dependency managers to be present.


