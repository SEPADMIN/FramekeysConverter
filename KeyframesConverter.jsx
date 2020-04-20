//GLOBAL VARS SECTION...
var _PROJ = app.project; 
var _COMP = _PROJ.activeItem;
var _PROPERTIES = [
            "position", 
            "rotation",
            "scale"
        ];
var _fSelectedLayersIndexes_arr = [];
//...GLOBAL VARS SECTION

//GUI SECTION...
_buildGUI = function ()
{
    var l_window = new Window("dialog", "Keyframes Converter", undefined);

    var lListboxContainer_panel = l_window.add("panel", undefined, "Container");
    lListboxContainer_panel.orientation = "row";

    var lSourceLayers_lb = lListboxContainer_panel.add("listbox", undefined);
    lSourceLayers_lb.alignment = ["fill", "fill"];
    lSourceLayers_lb.alignChildren = ["fill", "fill"];
    lSourceLayers_lb.bounds = { x:10, y:10, width:250, height:300 };

    var lDestLayers_lb = lListboxContainer_panel.add("listbox", undefined);
    lDestLayers_lb.alignment = ["fill", "fill"];
    lDestLayers_lb.alignChildren = ["fill", "fill"];
    lDestLayers_lb.bounds = { x:310, y:10, width:250, height:300 };

    var lSourceLayersIndexes_arr = [];
    var lDestLayersIndexes_arr = [];
    _fSelectedLayersIndexes_arr = lDestLayersIndexes_arr;

    for (var i = 1; i <= _COMP.layers.length; i++)
    {
        if (_COMP.layers[i] !== null)
        {
            lSourceLayers_lb.add("item", _COMP.layers[i].name);
            lSourceLayersIndexes_arr.push(i);
        }
    }

    lSourceLayers_lb.onDoubleClick = function ()
    {
        _moveSelectedLayerBetweenGroups(lSourceLayers_lb, lSourceLayersIndexes_arr, lDestLayers_lb, lDestLayersIndexes_arr);
    }

    lDestLayers_lb.onDoubleClick = function ()
    {
        _moveSelectedLayerBetweenGroups(lDestLayers_lb, lDestLayersIndexes_arr, lSourceLayers_lb, lSourceLayersIndexes_arr);
    }

    var lDescription_txt = l_window.add("statictext", undefined, "Double click on item to move it between groups");
    lDescription_txt.alignment = ["fill", "fill"];

    l_window.options = l_window.add("panel", undefined, "Settings", {name:"options"}); 

    for (var i = 0; i < _PROPERTIES.length; i++)
    {
        l_window[_PROPERTIES[i]] = l_window.options.add("checkbox", undefined, _PROPERTIES[i], {name:"property_" + i}); 
        l_window[_PROPERTIES[i]].value = true;
    }

    l_window.options.fileNameLabel = l_window.options.add("statictext", undefined, "json file name:"); 
    l_window.options.fileName = l_window.options.add("edittext", undefined, "fileName");
    l_window.options.convertBtn = l_window.options.add("button", undefined, 'Convert', {name:"ok"}); 

    l_window.show(); 

    return l_window;
}

_moveSelectedLayerBetweenGroups = function (aSrcLayersGroup_lb, aSourceLayersIndexes_arr, aDestLayersGroup_lb, aDestLayersIndexes_arr)
{
    var lLayer_lbi = aSrcLayersGroup_lb.selection;
    if (lLayer_lbi === null)
    {
        return;
    }
    var lRelativeLayerIndex_num = lLayer_lbi.index;

    aDestLayersGroup_lb.add("item", lLayer_lbi.text);
    aDestLayersIndexes_arr.push(aSourceLayersIndexes_arr[lRelativeLayerIndex_num]);

    aSrcLayersGroup_lb.remove(lLayer_lbi);
    aSourceLayersIndexes_arr.splice(lRelativeLayerIndex_num, 1);
}
//...GUI SECTION

//FUNCTION SECTION...
//debug section to be deleted...//
//log wrapper
log = function (a_str)
{
    $.writeln(a_str);
}
//...debug section to be deleted//

_getProperties = function (a_window)
{
    //specify properties to export
    var lProperties_arr = [];
    var lWinOptions_arr = a_window.children['options'];
    for (var i = 0; i < _PROPERTIES.length; i++) 
    {
        lWinOptions_arr.children["property_" + i].value && lProperties_arr.push(_PROPERTIES[i]);
    }
    return lProperties_arr;
}

_getFileName = function (a_window)
{
    //specify file name or fall back to file name + .json
    var lFileName_str = a_window.options.fileName.text;
    if (lFileName_str == "fileName")
    {
        lFileName_str = _PROJ.file.name.replace(".aep", "");
    }
    return lFileName_str;
}

//gets a URL based on the file path and the name 
_getUrl = function (aURL_str) 
{
    var lProjectName_str = app.project.file.name.replace(".aep", "");
    var lCompName_str = app.project.activeItem.name;
    var lFileName_str = aURL_str || lProjectName_str + "_"+ lCompName_str + ".json";
    lFileName_str = lFileName_str.replace(/\s/g, "");
    var lPath_str = app.project.file.parent.absoluteURI + "/";
    return lPath_str + lFileName_str;
}

//   you need to allow AE to write files to your hard drive:
//   go to: Edit > Preferences > General > and check on "Allow Scripts to Write Files and Access Network"
//
//write the output to disk:
_saveFile = function (aSrc_obj, lFileName_str) 
{
    var lOutput_file = new File(_getUrl(lFileName_str + ".json"));
    if (lOutput_file.open("w")) 
    {
        lOutput_file.encoding = "UTF-8";
        var lContent = JSON.stringify(aSrc_obj, undefined, 2);
        lOutput_file.write(lContent);
        lOutput_file.close();
    }
}

_scanSelectedLayers = function (a_window, aDest_obj, aProperties_arr)
{
    var lLayersContainer_panel = a_window.children[0];
    var lLayers_lb = lLayersContainer_panel.children[1];

    if (!lLayers_lb || lLayers_lb.children.length === 0)
    {
        //log("No items selected");
        return null;
    }

    var lTmp_obj = {};

    //for each selected layer
    for (var childIndex = 0; childIndex < lLayers_lb.children.length; childIndex++)
    {
        var lLayer = _COMP.layer(_fSelectedLayersIndexes_arr[childIndex]);
        if (lLayer == null)
        {
            //log("layer skipped");
            continue;
        }

        //for each property of selected layer
        lTmp_obj[lLayer.name.replace(/\s/g, "_").toLowerCase()] = {};

        var lProperties_arr = _getProperties(a_window);
        for (var propIndex = 0; propIndex < lProperties_arr.length; propIndex++)
        {
            var l_property = lLayer[lProperties_arr[propIndex]];
            var lNumKeys_int = l_property.numKeys;
            if (lNumKeys_int <= 0)
            {
                //log("property skipped");
                continue;
            }

            var lValues_arr = {};

            //cut identical values from the end of the property
            var lLastKey_int = lNumKeys_int;
            while (
                    (lLastKey_int > 1) &&
                    (_areValuesEqual(l_property.keyValue(lLastKey_int), l_property.keyValue(lLastKey_int - 1)))
                )
            {
                lLastKey_int--;
            }

            //for each timestamp of the property
            for (var keyIndex = 1; keyIndex <= lLastKey_int; keyIndex++)
            {
                var lValue = l_property.keyValue(keyIndex);
                var lTimestamp = l_property.keyTime(keyIndex);
                lValues_arr[lTimestamp] = {};
                if (lValue instanceof Array)
                {
                    switch(lProperties_arr[propIndex])
                    {
                        case "scale":
                            lValues_arr[lTimestamp]["sx"] = (lValue[0] / 100).toFixed(2);
                            lValues_arr[lTimestamp]["sy"] = (lValue[1] / 100).toFixed(2);
                            break;
                        case "position":
                            lValues_arr[lTimestamp]["x"] = (lValue[0]).toFixed(2);
                            lValues_arr[lTimestamp]["y"] = (lValue[1]).toFixed(2);
                            break;
                    }
                }
                else
                {
                    switch(lProperties_arr[propIndex])
                    {
                        case "rotation":
                            lValues_arr[lTimestamp]["r"] = (lValue * Math.PI / 180).toFixed(2);
                            break;
                        case "alpha":
                            lValues_arr[lTimestamp]["a"] = (lValue / 100).toFixed(2);
                            break;
                    }
                }
                lTmp_obj[lLayer.name.replace(/\s/g, "_").toLowerCase()][lProperties_arr[propIndex]] = lValues_arr;
            }
        }
    }
    return lTmp_obj;
}

_areValuesEqual = function (aFirstValue, aSecondValue)
{
    if (
            aFirstValue instanceof Array
            || aSecondValue instanceof Array
        )
    {
        if (aFirstValue.length !== aSecondValue.length)
        {
            return false;
        }
        for (var i = 0; i < aFirstValue.length; i++)
        {
            if (aFirstValue[i] !== aSecondValue[i])
            {
                return false;
            }
        }
        return true;
    }
    else
    {
        return (aFirstValue === aSecondValue) ? true : false;
    }
}
//...FUNCTION SECTION

//EXEC SECTION...
var lOut_obj = {};
var l_window = _buildGUI();
var lProperties_arr = _getProperties(l_window);
var lFileName_str = _getFileName(l_window);
_saveFile(_scanSelectedLayers(l_window, lOut_obj, lProperties_arr), lFileName_str);
//...EXEC SECTION
