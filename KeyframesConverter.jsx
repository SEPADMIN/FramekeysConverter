//FUNCTION SECTION...
//debug section to be deleted...//
//log wrapper
log = function (arg)
{
    $.writeln(arg);
}

logLayersIndexes = function (layersIndexes_arr)
{
    var l_str = "";
    if (layersIndexes_arr.length === 0)
    {
        log("empty");
        return;
    }
    for (var i = 0; i < layersIndexes_arr.length; i++)
    {
        l_str += layersIndexes_arr[i] += " ";
    }
    log(l_str);
}
//...debug section to be deleted//

//gets a URL based on the file path and the name 
getUrl = function (name) 
{
    var projectName = app.project.file.name.replace(".aep", "");
    var compName = app.project.activeItem.name;
    var fileName = name || projectName + "_"+ compName + ".json";
    fileName = fileName.replace(/\s/g, "");
    var path = app.project.file.parent.absoluteURI + "/";
    return path + fileName;
}

//   you need to allow AE to write files to your hard drive:
//   go to: Edit > Preferences > General > and check on "Allow Scripts to Write Files and Access Network"
//
//write the output to disk:
saveFile = function (obj, fileName) 
{
    var output = new File(getUrl(fileName + ".json"));
    if (output.open("w")) 
    {
        output.encoding = "UTF-8";
        var content =JSON.stringify(out, undefined, 2);
        output.write(content);
        output.close();
    }
}

//recursive method to get all values from all layers
scanLayers = function (obj, id, props) 
{
    if (id > comp.layers.length)
    {
        return;
    }
    
    //for each layer 
    var layer = comp.layer(id);
    if (layer == null)
    {
        return;
    }
    
    //stores all layer's values in an object
    var tmp = {};
    tmp.times = [];

    //for each property  passed as an argument
    for (var p = 0; p < props.length; p++) 
    {
        var property = layer[props[p]]; 
        
        //gets the keyframe count
        var numKeys = property.numKeys; 
        
        //default value if property is not animated
        if (numKeys <= 0) 
        {
            tmp[props[p]] = null;
            continue;
        }
    
        //if the property is animated 
        var values = [];
        if (numKeys > 0)
        {
            var time, value; 
            for (var i = 1; i <= numKeys; i++) 
            {
                //gets the time and property values at this keyFrame
                time = property.keyTime(i); 
                value = property.keyValue(i);
                
                //stores them into an array which first value is the time stamp
                var keyframe = [time];
                if (!isNaN(value)) 
                {
                    // stores rotations in RADIANS
                    if (props[p] == "rotation")  
                    {
                        keyframe.push(value * Math.PI / 180);
                    }
                    else
                    {
                        keyframe.push(value);
                    }
                }
                else
                {
                    for(var j = 0; j < value.length; j++) 
                    {
                        keyframe.push(value[j]);
                    }
                }                
                //store this keyframe in the layer object
                values.push(keyframe);
                
                //if this timestamp was not yet present in the layer's list of timestamps
                var addTime = true;
                for (var j = 0; j < tmp.times.length; j++) 
                {
                    if (tmp.times[j] == time)
                    {
                        addTime = false;
                    }
                }
                //add it
                if (addTime) 
                {
                    tmp.times.push(time);
                }
            }
        }

        //stores the property's values for this layer and go to next property
        tmp[props[p]] = values;
      }
  
      //add this layer to the final object
      obj[layer.name.replace(/\s/g, "_").toLowerCase()] = tmp; 
      return scanLayers(obj, ++id, props);
}
//...FUNCTION SECTION

//GUI SECTION...
var win = new Window("dialog", "Keyframes Converter", undefined);

var lListboxContainer_panel = win.add("panel", undefined, "Container");
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

for (var i = 1; i <= comp.layers.length; i++)
{
    if (comp.layers[i] !== null)
    {
        lSourceLayers_lb.add("item", comp.layers[i].name);
        lSourceLayersIndexes_arr.push(i);
    }
}

lSourceLayers_lb.onDoubleClick = function ()
{
    moveSelectedLayerBetweenGroups(lSourceLayers_lb, lSourceLayersIndexes_arr, lDestLayers_lb, lDestLayersIndexes_arr);

    //debug section to be deleted...//
    /*logLayersIndexes(lSourceLayersIndexes_arr);
    logLayersIndexes(lDestLayersIndexes_arr);*/
    //...debug section to be deleted//
}

lDestLayers_lb.onDoubleClick = function ()
{
    moveSelectedLayerBetweenGroups(lDestLayers_lb, lDestLayersIndexes_arr, lSourceLayers_lb, lSourceLayersIndexes_arr);

    //debug section to be deleted...//
    /*logLayersIndexes(lSourceLayersIndexes_arr);
    logLayersIndexes(lDestLayersIndexes_arr);*/
    //...debug section to be deleted//
}

moveSelectedLayerBetweenGroups = function (aSrcLayersGroup_lb, aSourceLayersIndexes_arr, aDestLayersGroup_lb, aDestLayersIndexes_arr)
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

var lDescription_txt = win.add("statictext", undefined, "Double click on item to move it between groups");
lDescription_txt.alignment = ["fill", "fill"];

win.options = win.add("panel", undefined, "Settings"); 
var prs = [
        "position", 
        "rotation",
        "scale"
    ];

for (var i = 0; i < prs.length; i++)
{
    win[prs[i]] = win.options.add("checkbox", undefined, prs[i]); 
    win[prs[i]].value = true;
}

win.options.fileNameLabel = win.options.add("statictext", undefined, "json file name:"); 
win.options.fileName = win.options.add("edittext", undefined, "fileName");
win.options.convertBtn = win.options.add("button", undefined, 'Convert', {name:"ok"}); 

win.show(); 

//specify properties to export
var properties = [];
for (var i = 0; i < prs.length; i++) 
{
    //debug section to be deleted...//
    //log(prs[i] + " -> " + win[prs[i]].value);
    //...debug section to be deleted//
    if (win[prs[i]].value) 
    {
        properties.push(prs[i]);
    }
}

//specify file name or fall back to file name + .json
var fileName = win.options.fileName.text;
if (fileName == "fileName")
{
    fileName = app.project.file.name.replace(".aep", "");
}
//...GUI SECTION

//EXEC SECTION...
var proj = app.project; 
var comp = proj.activeItem; 
var out = {};
saveFile(scanLayers(out, 1, properties), fileName);
//...EXEC SECTION