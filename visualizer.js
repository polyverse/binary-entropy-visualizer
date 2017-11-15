
$(document).ready(attachVisualizers);

function attachVisualizers() {
    var divs = $("div.binaryVisualizer");
    divs.empty();
    divs.each(function(index) {
        attachVisualizer(this, index);
    })
}

function attachVisualizer(domElem, index) {

    if (!domElem) {
        console.log("Found domElement empty: " + domElem)
        return
    }

    var visualizerHtml =
    '<div class="file_collector" id="file_collector' + index + '">' +
        '<input class="file" type="file" id="file' + index + '"/>' +
        '<div class="drop_zone" id="drop_zone' + index + '">Drop files here</div>' +
    '</div>' +
    '<span id="filename' + index + '" style="display:none"></span>' +
    '<span id="analysis' + index + '" style="display:none"></span>' +
    '<canvas class="visualization" id="visualization' + index + '" style="display:none"></canvas>';

    var jqThis = $(domElem)
    // Check for the various File API support.
    if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
        jqThis.append("<p>Unable to render binary visualizer due to unsupported File APIs in this browser.</p>");
        return;
    }

    jqThis.append(visualizerHtml)

    document.getElementById('file' + index).addEventListener('change', getFileSelectHandler(getFileProcessor(index)), false);

    // Setup the dnd listeners.
    var dropZone = document.getElementById('drop_zone' + index);
    dropZone.addEventListener('dragover', handleDragOver, false);
    dropZone.addEventListener('drop', getFileDropHandler(getFileProcessor(index)), false);
}

function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

function getFileSelectHandler(processFiles) {
    return function handleFileSelect(evt) {
        var files = evt.target.files; // FileList object

        processFiles(files)
    }
}

function getFileDropHandler(processFiles) {
    return function handleFileDrop(evt) {
        evt.stopPropagation();
        evt.preventDefault();

        var files = evt.dataTransfer.files; // FileList object.
        processFiles(files)
    }
}

function getFileProcessor(index) {
    return function processFiles(files) {
        document.getElementById('file_collector' + index).style = "display:none"
        var fileElem = document.getElementById('filename' + index)
        fileElem.style = "display:block"
        var analysisElem = document.getElementById('analysis' + index)
        analysisElem.style = "display:block"
        var canvasElem = document.getElementById("visualization" + index)
        canvasElem.style = "display:block"

        if (files.length != 1) {
            fileElem.innerHTML = 'Number of files selected must be exactly 1. We found: ' + files.length;
            return
        }

        var f = files[0];
        var reader = new FileReader();
        reader.onabort = function(event) {
            $(fileElem).append(" Aborted!")
        }
        reader.onerror = function(event) {
            console.log(event)
            $(fileElem).append(" Error! View Console log for error details.")
        }
        reader.onprogress = function (event) {
            fileElem.innerHTML = '<strong>' + escape(f.name) + '</strong> - Begun loading of ' + f.size + ' bytes';
        }
        reader.onloadstart = function (event) {
            if (event.lengthComputable) {
                fileElem.innerHTML = '<strong>' + escape(f.name) + '</strong> - Loaded ' + event.loaded + ' of ' + event.total + ' bytes';
            }
        }

        reader.onload = function(event) {
            fileElem.innerHTML = '<strong>' + escape(f.name) + '</strong> - Loaded all ' + f.size + ' bytes';
            console.log(event.target.result);
            analyzeResultErrorCapture(event.target.result, analysisElem, canvasElem)
        }

        reader.readAsArrayBuffer(f)
    }
}

function analyzeResultErrorCapture(dataArray, analysisElem, canvasElem) {
  try {
    analyzeResult(dataArray, analysisElem, canvasElem)
  } catch (e) {
    analysisElem.innerHTML = 'Error when Analysing data: ' + e + '. '
    'This tool only processes 64-bit Linux <a href="https://en.wikipedia.org/wiki/Executable_and_Linkable_Format">ELF</a> binaries.';
  }
}

function analyzeResult(dataArray, analysisElem, canvasElem) {
    dataPublic = dataArray
    analysisElem.innerHTML = "Analysing data..."

    var ks = new KaitaiStream(dataArray, 0)
    elf = new Elf(ks)
    analysisElem.innerHTML =
    '<i>Type</i>: <b>' + Elf.ObjType[elf.header.eType] +
    '</b>, <i>Machine</i>: <b>' + Elf.Machine[elf.header.machine] +
    '</b>, <i>Bits</i>: <b>' + Elf.Bits[elf.bits] +
    '</b>, <i>Endian</i>: <b>' + Elf.Endian[elf.endian] +
    '</b>, <i>ABI</i>: <b>' + Elf.OsAbi[elf.abi] +
    '</b>, <i>ABI Version</i>: <b>' + elf.abiVersion +
    '</b>.<br/>';

    var expando = $('<a href="#">Show/Hide Details</a>')
    var expansionDiv = $('<div style="display: none"></div>');
    $(analysisElem).append(expando)
    $(analysisElem).append(expansionDiv)
    expando.click(function() {
      expansionDiv.toggle();
    });

    expansionDiv.append('<H5>Program Headers</H5>');
    //fill in expansionDiv with section and program headers
    var progHeadersList = $('<ul/>');
    expansionDiv.append(progHeadersList);
    for (phi in elf.header.programHeaders) {
      var ph = elf.header.programHeaders[phi];
      var phlstr = '<li>Type: ' + Elf.PhType[ph.type] + '</li>';
      var phl = $(phlstr);
      progHeadersList.append(phl);
    }

    expansionDiv.append('<H5>Section Headers</H5>');
    //fill in expansionDiv with section and program headers
    var sectionHeadersList = $('<ul/>');
    expansionDiv.append(sectionHeadersList);
    for (shi in elf.header.sectionHeaders) {
      var sh = elf.header.sectionHeaders[shi];
      var shlstr = '<li>Type: ' + Elf.ShType[sh.type] + '</li>';
      var shl = $(shlstr);
      sectionHeadersList.append(shl);
    }
}
