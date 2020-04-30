/*Designed by ircane*/
/*Implemented by ircane*/
//GLOBAL VARS SECTION...
var _PROJ = app.project; 
var _COMP = _PROJ.activeItem;
var _PROPERTIES = [
            "scale",
            "position", 
            "rotation",
            "opacity"
        ];
var _MIN_PROPERTY_VALUE = {
            scale: 0.01,
            position: 1,
            rotation: 1,
            opacity: 0.01
        };

var _fWindow = null;
var _fSelectedLayersIndexes_arr = null;
var _fSelectedLayersNames_arr = null;
var _fSelectedPropertiesNames_obj = null;
var _fLayerObjectsNames_arr = null;
var _fLayersPropertiesTimestampsBounds_obj = null;
var _fLayersTimestamps_obj = null;
var _fLayersPropertiesGroup_obj = null;
//...GLOBAL VARS SECTION

//GUI SECTION...
_buildGUI = function ()
{
    var l_window = new Window("dialog", "Keyframes Converter", undefined);
    _fWindow = l_window;

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
    l_window.settings.properties.alignChildren = ["fill", "top"];

    for (var i = 0; i < _PROPERTIES.length; i++)
    {
        var lProperty_cb = l_window.settings.properties.add("checkbox", undefined, _PROPERTIES[i], {name:"property_" + i}); 
        lProperty_cb.value = true;
    }

    l_window.settings.properties.property_0.onClick = function ()
    {
        l_window.settings.gut.sxsy_mode.enabled = l_window.settings.properties.property_0.value;
    }

    l_window.settings.properties.property_1.onClick = function ()
    {
        l_window.settings.gut.xy_mode.enabled = l_window.settings.properties.property_1.value;
    }

    l_window.settings.mode = l_window.settings.add("panel", undefined, "Output mode", {name:"mode"});
    l_window.settings.mode.alignChildren = ["fill", "top"];
    l_window.settings.mode.add("radiobutton", undefined, "GUTimeline", {name:"gut_mode"});
    l_window.settings.mode.add("radiobutton", undefined, "JSON", {name:"json_mode"});
    l_window.settings.mode.add("checkbox", undefined, "Group mode", {name:"group_mode"});
    l_window.settings.mode.gut_mode.value = true;
    l_window.settings.mode.group_mode.enabled = false;

    l_window.settings.mode.gut_mode.onClick = function ()
    {
        l_window.settings.mode.group_mode.enabled = false;
        l_window.settings.gut.enabled = true;
    }

    l_window.settings.mode.json_mode.onClick = function ()
    {
        l_window.settings.mode.group_mode.enabled = true;
        l_window.settings.gut.enabled = false;
    }

    l_window.settings.gut = l_window.settings.add("panel", undefined, "GUTimeline", {name:"gut"});
    l_window.settings.gut.alignChildren = ["fill", "top"];
    l_window.settings.gut.add("checkbox", undefined, "i_SET_SCALE_XY", {name:"sxsy_mode"});
    l_window.settings.gut.add("checkbox", undefined, "i_SET_XY", {name:"xy_mode"});
    l_window.settings.gut.sxsy_mode.value = true;
    l_window.settings.gut.xy_mode.value = true;
    l_window.settings.gut.separator = l_window.settings.gut.add("panel");
    l_window.settings.gut.separator.preferredSize = [0, 0];
    l_window.settings.gut.linear_mode = l_window.settings.gut.add("checkbox", undefined, "Linear interpolation", {name:"linear_mode"});
    l_window.settings.gut.linear_mode.value = true;
    l_window.settings.gut.max_error_group = l_window.settings.gut.add("group", undefined, {name:"max_error_group"});
    l_window.settings.gut.max_error_group.orientation = "row";
    l_window.settings.gut.max_error_group.add("statictext", undefined, "Max group error %:");
    l_window.settings.gut.max_error_group.add("edittext", undefined, "7", {name:"max_error"});
    l_window.settings.gut.max_error_group.max_error.characters = 2;

    l_window.settings.gut.linear_mode.onClick = function ()
    {
        l_window.settings.gut.max_error_group.enabled = l_window.settings.gut.linear_mode.value;
    }

    l_window.btns_group = l_window.add("group", undefined, {name:"btns_group"});
    l_window.btns_group.orientation = "row";
    l_window.btns_group.add("button", undefined, 'Convert', {name:"ok"});
    l_window.btns_group.add("button", undefined, 'Cancel', {name:"cancel"}); 

    l_window.btns_group.ok.onClick = function ()
    {
        l_window.close();
        return _exportObject(_getAnimationsObject());
    }

    l_window.btns_group.cancel.onClick = function ()
    {
        l_window.close();
        return false;
    }

    l_window.show(); 
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

_isGroupMode = function () //get if group mode checkbox is checked
{
    return _fWindow.children["settings"].children["mode"].children["group_mode"].value;
}

_isGUTimelineMode = function () //get if GUTimeline mode radiobutton is checked
{
    return _fWindow.children["settings"].children["mode"].children["gut_mode"].value;
}
//...GUI SECTION

//FUNCTION SECTION...
log = function (a_str) //log wrapper
{
    $.writeln(a_str);
}

_getProperties = function () //specify properties to export
{
    var lProperties_arr = [];
    var lWinOptions_arr = _fWindow.settings.properties;
    for (var i = 0; i < _PROPERTIES.length; i++) 
    {
        lWinOptions_arr.children["property_" + i].value && lProperties_arr.push(_PROPERTIES[i]);
    }
    return lProperties_arr;
}

_getPropertiesGUT = function (aLayerName_str)
{
    var lProperties_obj = {};
    lProperties_obj.srcNames = _fSelectedPropertiesNames_obj[aLayerName_str];
    lProperties_obj.names = [];
    lProperties_obj.mapping = [];
    for (var i = 0; i < lProperties_obj.srcNames.length; i++) 
    {
        if (
                (lProperties_obj.srcNames[i] === "scale")
                && (!(_fWindow.settings.gut.sxsy_mode.value))
            )
        {
            lProperties_obj.names.push("scale_x");
            lProperties_obj.mapping.push(i);
            lProperties_obj.names.push("scale_y");
            lProperties_obj.mapping.push(i);
        }
        else if (
                    (lProperties_obj.srcNames[i] === "position")
                    && (!(_fWindow.settings.gut.xy_mode.value))
                )
        {
            lProperties_obj.names.push("position_x");
            lProperties_obj.mapping.push(i);
            lProperties_obj.names.push("position_y");
            lProperties_obj.mapping.push(i);
        }
        else 
        {
            lProperties_obj.names.push(lProperties_obj.srcNames[i]);
            lProperties_obj.mapping.push(i);
        }
    }
    return lProperties_obj;
}

_secondsToFrames = function (aSeconds_num)
{
    return Math.round(aSeconds_num * _COMP.frameRate);
}

_getAnimationsObject = function ()
{
    var lLayersContainer_panel = _fWindow.children[0];
    var lLayers_lb = lLayersContainer_panel.children[1];
    var lProperties_arr = _getProperties();

    if (!lLayers_lb || lLayers_lb.children.length === 0)
    {
        return null;
    }

    var lTmp_obj = {};
    _fSelectedLayersNames_arr = [];
    _fSelectedPropertiesNames_obj = {};
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
        _fSelectedPropertiesNames_obj[lLayerName_str] = [];
        _fLayerObjectsNames_arr.push(lLayer.name);
        _fLayersPropertiesTimestampsBounds_obj[lLayerName_str] = {};
        lTmp_obj[lLayerName_str] = {};

        //for each property of selected layer
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
            _fSelectedPropertiesNames_obj[lLayerName_str].push(lPropertyName_str);
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
                    case "opacity":
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

_copyObjectValue = function (aDest_obj, aSrc_obj, aPropertyName_str)
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
    var lProperties_arr = _fSelectedPropertiesNames_obj[aLayerName_str];
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
        for (var propIndex = 0; propIndex < _fSelectedPropertiesNames_obj[lLayerName_str].length; propIndex++)
        {
            var lPropertyName_str = _fSelectedPropertiesNames_obj[lLayerName_str][propIndex];
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

_getObjectProperties = function (aSrc_obj)
{
    var l_arr = aSrc_obj.reflect.properties;
    if (l_arr.length > 4)
    {
        l_arr.splice(l_arr.length - 4, 4);
        return l_arr;
    }
    else
    {
        return [];
    }
}
//...FUNCTION SECTION

//EXPORT SECTION...
_exportAsGUTimeline = function (aSrc_obj)
{
    if (!(_fSelectedLayersNames_arr))
    {
        return undefined;
    }

    for (var layerIndex = 0; layerIndex < _fSelectedLayersNames_arr.length; layerIndex++)
    {
        var lLayerName_str = _fSelectedLayersNames_arr[layerIndex];
        var lProperties_obj = _getPropertiesGUT(lLayerName_str);

        if (!(_fSelectedPropertiesNames_obj[lLayerName_str]))
        {
            continue;
        }

        var lGlobalBounds_arr = _getLayerTimestampsBounds(lLayerName_str);
        var lText_str = "var l_gut = new GUTimeline();\n";

        for (var propIndex = 0; propIndex < lProperties_obj.names.length; propIndex++)
        {
            lText_str += "\nl_gut.i_addAnimation(context_obj_placeholder, GUTimeline.";

            var lPropertyName_str = lProperties_obj.srcNames[lProperties_obj.mapping[propIndex]];
            var lSrc_obj = aSrc_obj[lLayerName_str][lPropertyName_str];
            var l_vsdo = _getValuesDescriptionObject(lProperties_obj.names[propIndex]);

            lText_str += l_vsdo.recieverType;

            var lSrcPropertyTimestamps_arr = _getObjectProperties(lSrc_obj);
            var lLocalBounds_arr = _fLayersPropertiesTimestampsBounds_obj[lLayerName_str][lPropertyName_str];
            var lFrameDiff_int = _secondsToFrames(lLocalBounds_arr[0] - lGlobalBounds_arr[0]);

            var lInitValue_str = "";
            var lWaitingStart_bl = false;
            if (lFrameDiff_int > 0)
            {
                lInitValue_str = "init_value_placeholder";
                lWaitingStart_bl = true;
            }
            else if (l_vsdo.arrayMode)
            {
                lInitValue_str = "[";
                for (var i = 0; i < l_vsdo.names.length; i++)
                {
                    lInitValue_str += lSrc_obj[lSrcPropertyTimestamps_arr[0]][l_vsdo.names[i]];
                    (i < (l_vsdo.names.length - 1)) && lInitValue_str += ", ";
                }
                lInitValue_str += "]";
            }
            else
            {
                lInitValue_str = lSrc_obj[lSrcPropertyTimestamps_arr[0]][l_vsdo.names[0]];
            }
            lText_str += ", " + lInitValue_str + ",\n\t\t[\n";

            if (lFrameDiff_int > 0)
            {
                lText_str += "\t\t\t" + lFrameDiff_int + ",\n"
            }

            var lFrameCount = _secondsToFrames(lLocalBounds_arr[1] - lLocalBounds_arr[0]) + 1;
            var lTimestampIndex_int = 0;
            for (var frameIndex = lWaitingStart_bl ? 0 : 1; frameIndex < lFrameCount; frameIndex++)
            {
                var lWaitLength_int = 0;
                while (frameIndex < (lFrameCount - (lWaitingStart_bl ? 1 : 0))) //wait frames if current value equals next one(s)
                {
                    var lCheckNext_bl = true;
                    for (var i = 0; i < l_vsdo.names.length; i++)
                    {
                        var lCompareIndexDiff_int = lWaitingStart_bl ? -1 : 1;
                        if (!(_areValuesEqual(lSrc_obj[lSrcPropertyTimestamps_arr[frameIndex]][l_vsdo.names[i]], 
                            lSrc_obj[lSrcPropertyTimestamps_arr[frameIndex - lCompareIndexDiff_int]][l_vsdo.names[i]])))
                        {
                            lCheckNext_bl = false;
                            break;
                        }
                    }
                    if (!lCheckNext_bl)
                    {
                        break;
                    }

                    lWaitLength_int++;
                    frameIndex++;
                }
                if (frameIndex >= lFrameCount)
                {
                    break;
                }

                (lWaitLength_int > 0) && lText_str += "\t\t\t" + lWaitLength_int + ",\n";

                lText_str += "\t\t\t[";
                if (l_vsdo.arrayMode)
                {
                    lText_str += "[" + lSrc_obj[lSrcPropertyTimestamps_arr[frameIndex]][l_vsdo.names[0]] + ", " 
                        + lSrc_obj[lSrcPropertyTimestamps_arr[frameIndex]][l_vsdo.names[1]] + "], 1";
                }
                else
                {
                    lText_str += lSrc_obj[lSrcPropertyTimestamps_arr[frameIndex]][l_vsdo.names[0]] + ", 1";
                }
                lText_str += "]";
                (frameIndex < (lFrameCount - 1)) && lText_str += ",";
                lText_str += "\n";

                if (_fWindow.settings.gut.linear_mode.value) //linear interpolation
                {
                    var lLinearGroup_arr = _getNextLinearGroup(lSrc_obj, l_vsdo, frameIndex, lFrameCount);
                    if (lLinearGroup_arr.length >= 3)
                    {
                        frameIndex += lLinearGroup_arr.length - 1;
                        var lLinearGroupText_str = "\t\t\t[";

                        (l_vsdo.arrayMode) && lLinearGroupText_str += "[";
                        for (var i = 0; i < l_vsdo.names.length; i++)
                        {
                            lLinearGroupText_str += lLinearGroup_arr[lLinearGroup_arr.length - 1][l_vsdo.names[i]];
                            (i < (l_vsdo.names.length - 1)) && lLinearGroupText_str += ", ";
                        }
                        (l_vsdo.arrayMode) && lLinearGroupText_str += "]";

                        lLinearGroupText_str += ", " + (lLinearGroup_arr.length - 1);
                        lLinearGroupText_str += ", GUTimeline.i_EASE_LINEAR]";
                        lText_str += lLinearGroupText_str;
                        (frameIndex < (lFrameCount - 1)) && lText_str += ",";
                        lText_str += "\n";
                    }
                }
            }

            lText_str += "\t\t]\n\t);\n";
        }

        _saveAsGUTimeline(lText_str, lLayerName_str);
    }

    return true;
}

_getValuesDescriptionObject = function (aPropertyName_str)
{
    var lOut_obj = {};
    lOut_obj.names = [];
    lOut_obj.arrayMode = false;
    lOut_obj.srcName = aPropertyName_str;
    switch (aPropertyName_str)
    {
        case "position":
            lOut_obj.recieverType = "i_SET_XY";
            lOut_obj.arrayMode = true;
            lOut_obj.names.push("x", "y");
            break;
        case "scale":
            lOut_obj.recieverType = "i_SET_SCALE_XY";
            lOut_obj.arrayMode = true;
            lOut_obj.names.push("sx", "sy");
            break;
        case "position_x":
            lOut_obj.recieverType = "i_SET_X";
            lOut_obj.names.push("x");
            break;
        case "position_y":
            lOut_obj.recieverType = "i_SET_Y";
            lOut_obj.names.push("y");
            break;
        case "scale_x":
            lOut_obj.recieverType = "i_SET_SCALE_X";
            lOut_obj.names.push("sx");
            break;
        case "scale_y":
            lOut_obj.recieverType = "i_SET_SCALE_Y";
            lOut_obj.names.push("sy");
            break;
        case "rotation":
            lOut_obj.recieverType = "i_SET_ROTATION";
            lOut_obj.names.push("r");
            break;
        case "opacity":
            lOut_obj.recieverType = "i_SET_ALPHA";
            lOut_obj.names.push("a");
            break;
    }
    return lOut_obj;
}

//LINEAR INTERPOLATION SECTION...
_getNextLinearGroup = function (aSrc_obj, a_vsdo, aStartFrameIndex_int, aFrameCount_int)
{
    if ((aStartFrameIndex_int + 2) > (aFrameCount_int - 1))
    {
        return [];
    }

    var lMaxError_num = _getMaxError();
    var lSrcPropertyTimestamps_arr = _getObjectProperties(aSrc_obj);
    var lGroup_arr = [];

    lGroup_arr.push(aSrc_obj[lSrcPropertyTimestamps_arr[aStartFrameIndex_int]]);
    lGroup_arr.push(aSrc_obj[lSrcPropertyTimestamps_arr[aStartFrameIndex_int + 1]]);
    lGroup_arr.push(aSrc_obj[lSrcPropertyTimestamps_arr[aStartFrameIndex_int + 2]]);

    if (!(_isArrayLinear(lGroup_arr, a_vsdo, lMaxError_num)))
    {
        return [];
    }

    for (var frameIndex = aStartFrameIndex_int + 3; frameIndex < (aFrameCount_int - 1); frameIndex++)
    {
        lGroup_arr.push(aSrc_obj[lSrcPropertyTimestamps_arr[frameIndex]]);

        if (!(_isArrayLinear(lGroup_arr, a_vsdo, lMaxError_num)))
        {
            lGroup_arr.pop();
            break;
        }
    }

    return lGroup_arr;
}

_getAvgArrayDiff = function (aSrc_arr, a_vsdo, aPropIndex_int)
{
    var lDiffSum_num = 0;
    for (var arrIndex = 0; arrIndex < (aSrc_arr.length - 1); arrIndex++)
    {
        lDiffSum_num += aSrc_arr[arrIndex + 1][a_vsdo.names[aPropIndex_int]] - aSrc_arr[arrIndex][a_vsdo.names[aPropIndex_int]];
    }
    return lDiffSum_num / (aSrc_arr.length - 1);
}

_isArrayAscending = function (aSrc_arr, a_vsdo, aPropIndex_int) //ascending returns true, descending return false, unordered returns undefined
{
    var lIsAscending_bl = true;
    var lIsDescending_bl = true;

    for (var arrIndex = 0; arrIndex < (aSrc_arr.length - 1); arrIndex++)
    {
        var lFirstValue_num = aSrc_arr[arrIndex][a_vsdo.names[aPropIndex_int]];
        var lSecondValue_num = aSrc_arr[arrIndex + 1][a_vsdo.names[aPropIndex_int]];
        if (lFirstValue_num > lSecondValue_num)
        {
            lIsAscending_bl = false;
        }
        else if (lFirstValue_num < lSecondValue_num)
        {
            lIsDescending_bl = false;
        }
    }

    if (
            (!lIsAscending_bl && !lIsDescending_bl)
            || (lIsAscending_bl && lIsDescending_bl)
        )
    {
        return undefined;
    }

    return lIsAscending_bl;
}

_isArrayLinear = function (aSrc_arr, a_vsdo, aMaxError_num)
{
    for (var arrIndex = 0; arrIndex < (aSrc_arr.length - 1); arrIndex++)
    {
        var lPropsEqual_bl = true;
        for (var propIndex = 0; propIndex < a_vsdo.names.length; propIndex++)
        {
            if (_isArrayAscending(aSrc_arr, a_vsdo, propIndex) === undefined)
            {
                return false;
            }
            var lFirstValue_num = aSrc_arr[arrIndex][a_vsdo.names[propIndex]];
            var lSecondValue_num = aSrc_arr[arrIndex + 1][a_vsdo.names[propIndex]];
            if (lPropsEqual_bl && (lFirstValue_num !== lSecondValue_num))
            {
                lPropsEqual_bl = false;
            }
            var lAvgDiff_num = Math.abs(_getAvgArrayDiff(aSrc_arr, a_vsdo, propIndex));
            var lCurrentDiff_num = Math.abs(lSecondValue_num - lFirstValue_num);
            var lCurrentError_num = Math.abs(lCurrentDiff_num - lAvgDiff_num) / Math.abs(lAvgDiff_num) * 100;
            if (Math.abs(lCurrentDiff_num - lAvgDiff_num) < (_MIN_PROPERTY_VALUE[a_vsdo.srcName]) * 2 / 3)
            {
                continue;
            }
            if (lCurrentError_num > aMaxError_num)
            {
                return false;
            }
        }
        if (lPropsEqual_bl)
        {
            return false;
        }
    }

    return true;
}

_getMaxError = function ()
{
    return Number(_fWindow.settings.gut.max_error_group.max_error.text);
}
//...LINEAR INTERPOLATION SECTION

_exportAsJSON = function (aSrc_obj)
{
    if (!(_fSelectedLayersNames_arr))
    {
        return undefined;
    }

    for (var layerIndex = 0; layerIndex < _fSelectedLayersNames_arr.length; layerIndex++)
    {
        var lDest_obj = {};
        var lLayerName_str = _fSelectedLayersNames_arr[layerIndex];
        var lProperties_arr = _fSelectedPropertiesNames_obj[lLayerName_str];
        lDest_obj[lLayerName_str] = {};
        lDest_obj[lLayerName_str]["samples"] = [];
        var lData_obj = lDest_obj[lLayerName_str]["samples"];

        var lGlobalBounds_arr = _getLayerTimestampsBounds(lLayerName_str);

        var lFrameCount = _secondsToFrames(lGlobalBounds_arr[1] - lGlobalBounds_arr[0]) + 1;
        for (var i = 0; i < lFrameCount; i++)
        {
            lData_obj.push({});
        }

        for (var propIndex = 0; propIndex < lProperties_arr.length; propIndex++)
        {
            var lPropertyName_str = lProperties_arr[propIndex];
            var lSrc_obj = aSrc_obj[lLayerName_str][lPropertyName_str];

            var lLocalBounds_arr = _fLayersPropertiesTimestampsBounds_obj[lLayerName_str][lPropertyName_str];

            var lFrameDiff_int = _secondsToFrames(lLocalBounds_arr[0] - lGlobalBounds_arr[0]);
            for (var frameIndex = 0; frameIndex < lFrameDiff_int; frameIndex++)
            {
                _copyObjectValue(lData_obj[frameIndex], lSrc_obj[lLocalBounds_arr[0]], lPropertyName_str);
            }

            var lSrcPropertyTimestamps_arr = _getObjectProperties(lSrc_obj);
            var lTimestampIndex_int = 0;
            for (var frameIndex = lFrameDiff_int; frameIndex < lFrameDiff_int + lSrcPropertyTimestamps_arr.length; frameIndex++)
            {
                _copyObjectValue(lData_obj[frameIndex], lSrc_obj[lSrcPropertyTimestamps_arr[lTimestampIndex_int]], lPropertyName_str);
                lTimestampIndex_int++;
            }

            var lLeftBoundFrame_int = lFrameDiff_int + lSrcPropertyTimestamps_arr.length;
            lFrameDiff_int = _secondsToFrames(lGlobalBounds_arr[1] - lLocalBounds_arr[1]);
            for (var frameIndex = lLeftBoundFrame_int; frameIndex < lLeftBoundFrame_int + lFrameDiff_int; frameIndex++)
            {
                _copyObjectValue(lData_obj[frameIndex], lSrc_obj[lLocalBounds_arr[1]], lPropertyName_str);
            }
        }

        _saveAsJSON(lDest_obj, lLayerName_str);
    }

    return true;
}

_exportByGroupsAsJSON = function (aSrc_obj)
{
    if (!(_fSelectedLayersNames_arr))
    {
        return undefined;
    }

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

            var lFrameCount = _secondsToFrames(lGroupBounds_arr[1] - lGroupBounds_arr[0]) + 1;
            for (var i = 0; i < lFrameCount; i++)
            {
                lData_obj.push({});
            }

            for (var propIndex = 0; propIndex < lGroup_arr.children.length; propIndex++)
            {
                var lPropertyName_str = lGroup_arr.children[propIndex];
                var lSrc_obj = aSrc_obj[lLayerName_str][lPropertyName_str];
                var lLocalBounds_arr = _fLayersPropertiesTimestampsBounds_obj[lLayerName_str][lPropertyName_str];

                var lFrameDiff_int = _secondsToFrames(lLocalBounds_arr[0] - lGroupBounds_arr[0]);
                for (var frameIndex = 0; frameIndex < lFrameDiff_int; frameIndex++)
                {
                    _copyObjectValue(lData_obj[frameIndex], lSrc_obj[lLocalBounds_arr[0]], lPropertyName_str);
                }

                var lSrcPropertyTimestamps_arr = _getObjectProperties(lSrc_obj);
                var lTimestampIndex_int = 0;
                for (var frameIndex = lFrameDiff_int; frameIndex < lFrameDiff_int + lSrcPropertyTimestamps_arr.length; frameIndex++)
                {
                    _copyObjectValue(lData_obj[frameIndex], lSrc_obj[lSrcPropertyTimestamps_arr[lTimestampIndex_int]], lPropertyName_str);
                    lTimestampIndex_int++;
                }

                var lLeftBoundFrame_int = lFrameDiff_int + lSrcPropertyTimestamps_arr.length;
                lFrameDiff_int = _secondsToFrames(lGroupBounds_arr[1] - lLocalBounds_arr[1]);
                for (var frameIndex = lLeftBoundFrame_int; frameIndex < lLeftBoundFrame_int + lFrameDiff_int; frameIndex++)
                {
                    _copyObjectValue(lData_obj[frameIndex], lSrc_obj[lLocalBounds_arr[1]], lPropertyName_str);
                }
            }

            var lPostfix_str = "";
            for (var i = 0; i < lGroup_arr.children.length; i++)
            {
                lPostfix_str += "_" + lGroup_arr.children[i];
            }
            _saveAsJSON(lDest_obj, lLayerName_str + lPostfix_str);
        }
    }

    return true;
}

_exportObject = function (aSrc_obj) //wrapper for export
{
    if (_isGUTimelineMode())
    {
        return _exportAsGUTimeline(aSrc_obj);
    }
    else
    {
        if (_isGroupMode())
        {
            return _exportByGroupsAsJSON(aSrc_obj);
        }
        else
        {
            return _exportAsJSON(aSrc_obj);
        }
    }
}

_saveAsJSON = function (aSrc_obj, aFileName_str)
{
    var lOutput_file = new File(_getUrl(aFileName_str + ".json"));
    var lTest_file = new File(_getUrl(aFileName_str + "_test.json"));
    if (lOutput_file.open("w")) 
    {
        lOutput_file.encoding = "UTF-8";
        var lContent = JSON.stringify(aSrc_obj, undefined, 2);
        lContent = _formatJSON(lContent);
        lOutput_file.write(lContent);
        lOutput_file.close();
        return true;
    }
    return false;
}

_formatJSON = function (aSrc_str)
{
    var l_str = aSrc_str.replace(/{\s*\n+\s*(["].*["]:\s*\d)/g, "$1");
    l_str = l_str.replace(/(.*)[,]\s*\n\s*["]/g, "$1,\"");
    l_str = l_str.replace(/(\d)\s*\n\s*}/g, "$1}");
    l_str = l_str.replace(/\s*:\s*/g, ":");
    return l_str;
}

_saveAsGUTimeline = function (aText_str, aFileName_str)
{
    var lOutput_file = new File(_getUrl(aFileName_str + "_gut.js"));
    if (lOutput_file.open("w")) 
    {
        lOutput_file.encoding = "UTF-8";
        lOutput_file.write(aText_str);
        lOutput_file.close();
        return true;
    }
    return false;
}

_getUrl = function (aURL_str) //gets a URL based on the file path and the name 
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
//...EXPORT SECTION

_buildGUI();
