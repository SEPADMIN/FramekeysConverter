//GLOBAL VARS SECTION...
var _PROJ = app.project; 
var _COMP = _PROJ.activeItem;
var _PROPERTIES = [
            "scale",
            "position", 
            "rotation",
            "opacity"
        ];
var _fSelectedLayersIndexes_arr = null;
var _fSelectedLayersNames_arr = null;
var _fLayerObjectsNames_arr = null;
var _fLayersPropertiesTimestampsBounds_obj = null;
var _fLayersTimestamps_obj = null;
var _fLayersPropertiesGroup_obj = null;
//...GLOBAL VARS SECTION

//GUI SECTION...
_buildGUI = function ()
{
    var l_window = new Window("dialog", "Keyframes Converter", undefined);

    var lListboxContainer_panel = l_window.add("panel", undefined, "Double click on item to move it between groups");
    lListboxContainer_panel.orientation = "row";

    var lSourceLayers_lb = lListboxContainer_panel.add("listbox", undefined);
    lSourceLayers_lb.alignChildren = ["fill", "fill"];
    lSourceLayers_lb.preferredSize = [250, 300];

    var lDestLayers_lb = lListboxContainer_panel.add("listbox", undefined);
    lDestLayers_lb.alignChildren = ["fill", "fill"];
    lDestLayers_lb.preferredSize = [250, 300];

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

    l_window.settings = l_window.add("panel", undefined, "Settings", {name:"settings"}); 
    l_window.settings.alignChildren = ["fill", "fill"];
    l_window.settings.orientation = "row";

    l_window.settings.properties = l_window.settings.add("panel", undefined, "Properties", {name:"properties"});
    l_window.settings.properties.alignChildren = ["fill", "fill"];

    for (var i = 0; i < _PROPERTIES.length; i++)
    {
        var lProperty_cb = l_window.settings.properties.add("checkbox", undefined, _PROPERTIES[i], {name:"property_" + i}); 
        lProperty_cb.value = true;
    }

    l_window.settings.options = l_window.settings.add("panel", undefined, "Options", {name:"options"});
    l_window.settings.options.alignChildren = ["fill", "fill"];
    l_window.settings.options.add("checkbox", undefined, "Group mode", {name:"group_mode"});

    var lConvertBtn = l_window.add("button", undefined, 'Convert', {name:"ok"}); 

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
    var lWinOptions_arr = a_window.children["settings"].children["properties"];
    for (var i = 0; i < _PROPERTIES.length; i++) 
    {
        lWinOptions_arr.children["property_" + i].value && lProperties_arr.push(_PROPERTIES[i]);
    }
    return lProperties_arr;
}

_isGroupMode = function (a_window)
{
    return a_window.children["settings"].children["options"].children["group_mode"].value;
}

//gets a URL based on the file path and the name 
_getUrl = function (aURL_str) 
{
    var lProjectName_str = app.project.file.name.replace(".aep", "");
    var lCompName_str = app.project.activeItem.name;
    var lFileName_str = aURL_str || lProjectName_str + "_"+ lCompName_str + ".json";
    lFileName_str = lFileName_str.replace(/\s/g, "");
    var lPath_str = app.project.file.parent.absoluteURI + "/Export/";
    var lExport_folder = new Folder(lPath_str);
    !(lExport_folder.exists) && lExport_folder.create();
    return lPath_str + lFileName_str;
}

//   you need to allow AE to write files to your hard drive:
//   go to: Edit > Preferences > General > and check on "Allow Scripts to Write Files and Access Network"
//
//write the output to disk:
_saveJSONFile = function (aSrc_obj, aFileName_str)
{
    var lOutput_file = new File(_getUrl(aFileName_str + ".json"));
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
        return null;
    }

    var lTmp_obj = {};
    _fSelectedLayersNames_arr = [];
    _fSelectedLayersPropertiesNames_arr = {};
    _fLayersPropertiesTimestampsBounds_obj = {};
    _fLayerObjectsNames_arr = [];

    //for each selected layer
    for (var childIndex = 0; childIndex < lLayers_lb.children.length; childIndex++)
    {
        var lLayer = _COMP.layer(_fSelectedLayersIndexes_arr[childIndex]);
        if (lLayer == null)
        {
            continue;
        }

        var lLayerName_str = lLayer.name.replace(/\s/g, "_").toLowerCase();
        _fSelectedLayersNames_arr.push(lLayerName_str);
        _fLayerObjectsNames_arr.push(lLayer.name);
        _fSelectedLayersPropertiesNames_arr[lLayerName_str] = [];
        _fLayersPropertiesTimestampsBounds_obj[lLayerName_str] = {};
        lTmp_obj[lLayerName_str] = {};

        //for each property of selected layer
        var lProperties_arr = aProperties_arr;
        for (var propIndex = 0; propIndex < lProperties_arr.length; propIndex++)
        {
            var l_property = lLayer[lProperties_arr[propIndex]];
            var lNumKeys_int = l_property.numKeys;
            if (lNumKeys_int <= 0)
            {
                continue;
            }

            var lPropertyName_str = lProperties_arr[propIndex];
            var lValues_arr = {};
            _fSelectedLayersPropertiesNames_arr[lLayerName_str].push(lPropertyName_str);
            _fLayersPropertiesTimestampsBounds_obj[lLayerName_str][lPropertyName_str] = new Array(2);
            var lTimestampsBounds_arr = _fLayersPropertiesTimestampsBounds_obj[lLayerName_str][lPropertyName_str];

            //cut identical values from the end of the property
            var lLastKey_int = lNumKeys_int;
            while (
                    (lLastKey_int > 1) 
                    && (_areValuesEqual(l_property.keyValue(lLastKey_int), l_property.keyValue(lLastKey_int - 1)))
                )
            {
                lLastKey_int--;
            }

            lTimestampsBounds_arr[0] = l_property.keyTime(1);
            lTimestampsBounds_arr[1] = l_property.keyTime(lLastKey_int);

            //for each timestamp of the property
            for (var keyIndex = 1; keyIndex <= lLastKey_int; keyIndex++)
            {
                var lValue = l_property.keyValue(keyIndex);
                var lTimestamp_num = l_property.keyTime(keyIndex);
                lValues_arr[lTimestamp_num] = {};

                switch(lProperties_arr[propIndex])
                {
                    case "scale":
                        lValues_arr[lTimestamp_num]["sx"] = Number((lValue[0] / 100).toFixed(2));
                        lValues_arr[lTimestamp_num]["sy"] = Number((lValue[1] / 100).toFixed(2));
                        break;
                    case "position":
                        lValues_arr[lTimestamp_num]["x"] = Number((lValue[0]).toFixed(2));
                        lValues_arr[lTimestamp_num]["y"] = Number((lValue[1]).toFixed(2));
                        break;
                    case "rotation":
                        lValues_arr[lTimestamp_num]["r"] = Number((lValue * Math.PI / 180).toFixed(2));
                        break;
                    case "alpha":
                        lValues_arr[lTimestamp_num]["a"] = Number((lValue / 100).toFixed(2));
                        break;
                }

                lTmp_obj[lLayerName_str][lPropertyName_str] = lValues_arr;
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

/*_addTimestampIfRequired = function (aLayerName_str, aTimestamp_num)
{
    var lRequired_bl = true;
    if (!(_fSelectedLayersTimestamps_arr_arr[aLayerName_str] instanceof Array))
    {
        _fSelectedLayersTimestamps_arr_arr[aLayerName_str] = [];
    }
    for (var i = 0; i < _fSelectedLayersTimestamps_arr_arr[aLayerName_str].length; i++)
    {
        if (_fSelectedLayersTimestamps_arr_arr[aLayerName_str][i] === aTimestamp_num)
        {
            lRequired_bl = false;
        }
    }
    if (lRequired_bl)
    {
        _fSelectedLayersTimestamps_arr_arr[aLayerName_str].push(aTimestamp_num);
        return true;
    }
    return false;
}*/
//...FUNCTION SECTION

//JSON EXPORT SECTION...
_transformToJSON = function (aSrc_obj)
{
    if (!(_fSelectedLayersNames_arr))
    {
        return undefined;
    }
    for (var layerIndex = 0; layerIndex < _fSelectedLayersNames_arr.length; layerIndex++)
    {
        var lDest_obj = {};
        var lLayerName_str = _fSelectedLayersNames_arr[layerIndex];
        var lProperties_arr = _fSelectedLayersPropertiesNames_arr[lLayerName_str];
        lDest_obj[lLayerName_str] = {}
        lDest_obj[lLayerName_str]["samples"] = [];
        var lData_obj = lDest_obj[lLayerName_str]["samples"];
        var lDeltaTime_num = _COMP.frameDuration;
        var lFrameRate_num = _COMP.frameRate;

        var lGlobalBounds_arr = _getLayerTimestampsBounds(lLayerName_str);

        var lFrameCount = Math.round((lGlobalBounds_arr[1] - lGlobalBounds_arr[0]) * lFrameRate_num) + 1;

        for (var i = 0; i < lFrameCount; i++)
        {
            lData_obj.push({});
        }
        var lLayerName_str = _fSelectedLayersNames_arr[layerIndex];
        var lDeltaTime_num = _COMP.frameDuration;
        var lFrameRate_num = _COMP.frameRate;

        for (var propIndex = 0; propIndex < lProperties_arr.length; propIndex++)
        {
            var lPropertyName_str = lProperties_arr[propIndex];
            var lSrc_obj = aSrc_obj[lLayerName_str][lPropertyName_str];

            var lLocalBounds_arr = _fLayersPropertiesTimestampsBounds_obj[lLayerName_str][lPropertyName_str];

            var lFrameDiff_int = Math.round((lLocalBounds_arr[0] - lGlobalBounds_arr[0]) * lFrameRate_num);
            for (var i = 0; i < lFrameDiff_int; i++)
            {
                _fillObjectProperty(lData_obj[i], lSrc_obj[lLocalBounds_arr[0]], lPropertyName_str);
            }

            var lSrcPropertyTimestamps_arr = lSrc_obj.reflect.properties;
            lSrcPropertyTimestamps_arr.splice(lSrcPropertyTimestamps_arr.length - 4, 4);
            var lTimestampIndex_int = 0;
            for (var i = lFrameDiff_int; i < lFrameDiff_int + lSrcPropertyTimestamps_arr.length; i++)
            {
                _fillObjectProperty(lData_obj[i], lSrc_obj[lSrcPropertyTimestamps_arr[lTimestampIndex_int]], lPropertyName_str);
                lTimestampIndex_int++;
            }

            var lLeftBoundFrame_int = lFrameDiff_int + lSrcPropertyTimestamps_arr.length;
            lFrameDiff_int = Math.round((lGlobalBounds_arr[1] - lLocalBounds_arr[1]) * lFrameRate_num);
            for (var i = lLeftBoundFrame_int; i < lLeftBoundFrame_int + lFrameDiff_int; i++)
            {
                _fillObjectProperty(lData_obj[i], lSrc_obj[lLocalBounds_arr[1]], lPropertyName_str);
            }
        }

        _saveJSONFile(lDest_obj, lLayerName_str);
    }
    return true;
}

_transformGroupsToJSON = function (aSrc_obj)
{
    _groupPropertiesByIntersection();
    for (var layerIndex = 0; layerIndex < _fSelectedLayersNames_arr.length; layerIndex++)
    {
        var lLayerName_str = _fSelectedLayersNames_arr[layerIndex];
        var lDeltaTime_num = _COMP.frameDuration;
        var lFrameRate_num = _COMP.frameRate;

        for (var groupIndex = 0; groupIndex < _fLayersPropertiesGroup_obj[lLayerName_str].length; groupIndex++)
        {
            var lDest_obj = {};
            lDest_obj[lLayerName_str] = {}
            lDest_obj[lLayerName_str]["samples"] = [];
            var lData_obj = lDest_obj[lLayerName_str]["samples"];
            var lGroup_arr = _fLayersPropertiesGroup_obj[lLayerName_str][groupIndex];
            var lGroupBounds_arr = lGroup_arr.bounds;

            var lFrameCount = Math.round((lGroupBounds_arr[1] - lGroupBounds_arr[0]) * lFrameRate_num) + 1;
            for (var i = 0; i < lFrameCount; i++)
            {
                lData_obj.push({});
            }

            for (var propIndex = 0; propIndex < lGroup_arr.children.length; propIndex++)
            {
                var lPropertyName_str = lGroup_arr.children[propIndex];
                var lSrc_obj = aSrc_obj[lLayerName_str][lPropertyName_str];
                var lLocalBounds_arr = _fLayersPropertiesTimestampsBounds_obj[lLayerName_str][lPropertyName_str];

                var lFrameDiff_int = Math.round((lLocalBounds_arr[0] - lGroupBounds_arr[0]) * lFrameRate_num);
                for (var frameIndex = 0; frameIndex < lFrameDiff_int; frameIndex++)
                {
                    _fillObjectProperty(lData_obj[frameIndex], lSrc_obj[lLocalBounds_arr[0]], lPropertyName_str);
                }

                var lSrcPropertyTimestamps_arr = lSrc_obj.reflect.properties;
                lSrcPropertyTimestamps_arr.splice(lSrcPropertyTimestamps_arr.length - 4, 4);
                var lTimestampIndex_int = 0;
                for (var frameIndex = lFrameDiff_int; frameIndex < lFrameDiff_int + lSrcPropertyTimestamps_arr.length; frameIndex++)
                {
                    _fillObjectProperty(lData_obj[frameIndex], lSrc_obj[lSrcPropertyTimestamps_arr[lTimestampIndex_int]], lPropertyName_str);
                    lTimestampIndex_int++;
                }

                var lLeftBoundFrame_int = lFrameDiff_int + lSrcPropertyTimestamps_arr.length;
                lFrameDiff_int = Math.round((lGroupBounds_arr[1] - lLocalBounds_arr[1]) * lFrameRate_num);
                for (var frameIndex = lLeftBoundFrame_int; frameIndex < lLeftBoundFrame_int + lFrameDiff_int; frameIndex++)
                {
                    _fillObjectProperty(lData_obj[frameIndex], lSrc_obj[lLocalBounds_arr[1]], lPropertyName_str);
                }
            }

            var lPostfix_str = "";
            for (var i = 0; i < lGroup_arr.children.length; i++)
            {
                lPostfix_str += "_" + lGroup_arr.children[i];
            }
            _saveJSONFile(lDest_obj, lLayerName_str + lPostfix_str);
        }
    }
    return true;
}

_fillObjectProperty = function (aDest_obj, aSrc_obj, aPropertyName_str)
{
    switch (aPropertyName_str)
    {
        case "scale":
            aDest_obj["sx"] = aSrc_obj["sx"];
            aDest_obj["sy"] = aSrc_obj["sy"];
            break;
        case "position":
            aDest_obj["x"] = aSrc_obj["x"];
            aDest_obj["y"] = aSrc_obj["y"];
            break;
        case "rotation":
            aDest_obj["r"] = aSrc_obj["r"];
            break;
        case "opacity":
            aDest_obj["a"] = aSrc_obj["a"];
            break;
    }
}

_getLayerTimestampsBounds = function (aLayerName_str)
{
    var lProperties_arr = _fSelectedLayersPropertiesNames_arr[aLayerName_str];
    var lTimestampsBounds_arr = _fLayersPropertiesTimestampsBounds_obj[aLayerName_str][lProperties_arr[0]];
    var lMin_num = lTimestampsBounds_arr[0];
    var lMax_num = lTimestampsBounds_arr[1];
    for (var propIndex = 1; propIndex < lProperties_arr.length; propIndex++)
    {
        lTimestampsBounds_arr = _fLayersPropertiesTimestampsBounds_obj[aLayerName_str][lProperties_arr[propIndex]];
        lMin_num > lTimestampsBounds_arr[0] && lMin_num = lTimestampsBounds_arr[0];
        lMax_num < lTimestampsBounds_arr[1] && lMax_num = lTimestampsBounds_arr[1];
    }
    return [lMin_num, lMax_num];
}

_groupPropertiesByIntersection = function ()
{
    var lGroup_obj = {};

    for (var layerIndex = 0; layerIndex < _fSelectedLayersNames_arr.length; layerIndex++)
    {
        var lLayerName_str = _fSelectedLayersNames_arr[layerIndex];
        !(lGroup_obj.hasOwnProperty(lLayerName_str)) && lGroup_obj[lLayerName_str] = [];
        var lGroup_arr = lGroup_obj[lLayerName_str];
        for (var propIndex = 0; propIndex < _fSelectedLayersPropertiesNames_arr[lLayerName_str].length; propIndex++)
        {
            var lPropertyName_str = _fSelectedLayersPropertiesNames_arr[lLayerName_str][propIndex];
            var lPropertyBounds_arr = _fLayersPropertiesTimestampsBounds_obj[lLayerName_str][lPropertyName_str];

            var lAddGroup_bl = true;
            for (var groupIndex = 0; groupIndex < lGroup_arr.length; groupIndex++)
            {
                if (
                        (lGroup_arr[groupIndex].bounds[1] < lPropertyBounds_arr[0])
                        || (lGroup_arr[groupIndex].bounds[0] > lPropertyBounds_arr[1])
                    )
                {
                    continue;
                }
                else 
                {
                    !(lGroup_arr[groupIndex].hasOwnProperty("children")) && lGroup_arr[groupIndex].children = [];
                    lGroup_arr[groupIndex].children.push(lPropertyName_str);
                    !(lGroup_arr[groupIndex].hasOwnProperty("bounds")) && lGroup_arr[groupIndex].bounds = [];
                    lGroup_arr[groupIndex].bounds[0] = Math.min(lGroup_arr[groupIndex].bounds[0], lPropertyBounds_arr[0]);
                    lGroup_arr[groupIndex].bounds[1] = Math.max(lGroup_arr[groupIndex].bounds[1], lPropertyBounds_arr[1]);
                    lAddGroup_bl = false;
                    break;
                }
            }
            if (lAddGroup_bl)
            {
                var newGroupIndex = lGroup_arr.length;
                lGroup_arr.push({});
                lGroup_arr[newGroupIndex].bounds = lPropertyBounds_arr;
                lGroup_arr[newGroupIndex].children = [];
                lGroup_arr[newGroupIndex].children.push(lPropertyName_str);
            }
        }
    }

    _fLayersPropertiesGroup_obj = lGroup_obj;
}
//...JSON EXPORT SECTION

//EXEC SECTION...
var lOut_obj = {};
var l_window = _buildGUI();
var lProperties_arr = _getProperties(l_window);
var lTmp_obj = _scanSelectedLayers(l_window, lOut_obj, lProperties_arr);
if (_isGroupMode(l_window))
{
    _transformGroupsToJSON(lTmp_obj);
}
else
{
    _transformToJSON(lTmp_obj);
}
//...EXEC SECTION
