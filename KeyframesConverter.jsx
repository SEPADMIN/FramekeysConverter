//FUNCTION SECTION...
//log wrapper
function log(arg)
{
    $.writeln(arg);
}

//gets a URL based on the file path and the name 
function getUrl(name) 
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
function saveFile(obj, fileName) 
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
function scanLayers(obj, id, props) 
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
/*var lWindowSizeX_num = 570;
var lWindowSizeY_num = 600;
var lWindowOffsetX_num = $.screens[0].right / 2 - lWindowSizeX_num / 2;
var lWindowOffsetY_num = $.screens[0].bottom / 2 - lWindowSizeY_num / 2;*/
var win = new Window("dialog", "Keyframes Converter", 
    //[lWindowOffsetX_num, lWindowOffsetY_num, lWindowSizeX_num + lWindowOffsetX_num, lWindowSizeY_num + lWindowOffsetY_num]);
    undefined);

var lListboxContainer_panel = win.add("panel", undefined, "Container");
lListboxContainer_panel.orientation = "row";

var lSourceLayers_lb = lListboxContainer_panel.add("listbox", undefined);
lSourceLayers_lb.alignment = ["fill", "fill"];
lSourceLayers_lb.alignChildren = ["fill", "fill"];
lSourceLayers_lb.bounds = { x:10, y:10, width:250, height:300 };

var lTogoLayers_lb = lListboxContainer_panel.add("listbox", undefined);
lTogoLayers_lb.alignment = ["fill", "fill"];
lTogoLayers_lb.alignChildren = ["fill", "fill"];
lTogoLayers_lb.bounds = { x:310, y:10, width:250, height:300 };

var lSourceLayersIndexes_int_arr = [];
var lTogoLayersIndexes_int_arr = [];

for (var i = 1; i <= /*comp.layers.length*/  6; i++)
{
    if (comp.layers[i] !== null)
    {
        lSourceLayers_lb.add("item", comp.layers[i].name);
        lSourceLayersIndexes_int_arr.push(i);
    }
}

lSourceLayers_lb.onDoubleClick = function ()
{
    var lLayer_lbi = lSourceLayers_lb.selection;
    var lRelativeLayerIndex_num = lLayer_lbi.index;

    lTogoLayers_lb.add("item", lLayer_lbi.text);
    lTogoLayersIndexes_int_arr.push(lSourceLayersIndexes_int_arr[lRelativeLayerIndex_num]);

    lSourceLayers_lb.remove(lLayer_lbi);
    lSourceLayersIndexes_int_arr.splice(lRelativeLayerIndex_num, 1);
}

lTogoLayers_lb.onDoubleClick = function ()
{
    var lLayer_lbi = lTogoLayers_lb.selection;
    var lRelativeLayerIndex_num = lLayer_lbi.index;

    lSourceLayers_lb.add("item", lLayer_lbi.text);
    lSourceLayersIndexes_int_arr.push(lTogoLayersIndexes_int_arr[lRelativeLayerIndex_num]);

    lTogoLayers_lb.remove(lLayer_lbi);
    lTogoLayersIndexes_int_arr.splice(lRelativeLayerIndex_num, 1);
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
    log(prs[i] + " -> " + win[prs[i]].value);
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