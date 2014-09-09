/*!
 * froala_editor v1.1.7 (http://editor.froala.com)
 * Copyright 2014-2014 Froala
 */

$.Editable.commands = $.extend($.Editable.commands, {
  table: {
    title: 'Table',
    icon: 'fa fa-table'
  }
});

$.Editable.DEFAULTS.buttons[$.Editable.DEFAULTS.buttons.indexOf('insertHorizontalRule')] = 'table';

$.Editable.prototype.execCommand = $.extend($.Editable.prototype.execCommand, {
  insertTable: function (cmd, val, param) {
    this.insertTable(val, param);
  },

  insertRowAbove: function (cmd, val, param) {
    this.insertRow('above');
  },

  insertRowBelow: function (cmd, val, param) {
    this.insertRow('below');
  },

  insertColumnBefore: function (cmd, val, param) {
    this.insertColumn('before');
  },

  insertColumnAfter: function (cmd, val, param) {
    this.insertColumn('after');
  },

  deleteColumn: function (cmd, val, param) {
    this.deleteColumn();
  },

  deleteRow: function (cmd, val, param) {
    this.deleteRow();
  },

  insertCellBefore: function (cmd, val, param) {
    this.insertCell('before');
  },

  insertCellAfter: function (cmd, val, param) {
    this.insertCell('after');
  },

  mergeCells: function (cmd, val, param) {
    this.mergeCells();
  },

  deleteCell: function (cmd, val, param) {
    this.deleteCell();
  },

  splitVertical: function (cmd, val, param) {
    this.splitVertical();
  },

  splitHorizontal: function (cmd, val, param) {
    this.splitHorizontal();
  },

  insertHeader: function (cmd, val, param) {
    this.insertHeader();
  },

  deleteHeader: function (cmd, val, param) {
    this.deleteHeader();
  },

  deleteTable: function (cmd, val, param) {
    this.deleteTable();
  }
});


$.Editable.prototype.command_dispatcher = $.extend($.Editable.prototype.command_dispatcher, {
  table: function (command) {
    var dropdown = this.buildDropdownTable();
    var btn = this.buildDropdownButton(command, dropdown, 'fr-table');
    this.$bttn_wrapper.append(btn);
    this.bindTableDropdownEvents();
  }
});

/**
 * Dropdown for table.
 *
 * @param command
 * @returns {*}
 */
$.Editable.prototype.buildDropdownTable = function () {
  var dropdown = '<ul class="fr-dropdown-menu fr-table">';

  dropdown += '<li> \
    <a href="#"><span data-text="true">Insert table</span> <i class="fa fa-chevron-right"></i></a>\
    <div class="select-table"> ';

  dropdown += '<div class="fr-t-info">1 x 1</div>';

  for (var i = 1; i <= 10; i++) {
    for (var j = 1; j <= 10; j++) {
      var display = 'inline-block';
      if (i > 5 || j > 5) {
        display = 'none';
      }

      var cls = 'fr-bttn ';
      if (i == 1 && j == 1) {
        cls += ' hover';
      }

      dropdown += '<span class="' + cls + '" data-cmd="insertTable" data-val="' + i + '" data-param="' + j + '" style="display: ' + display + ';"><span></span></span>';
    }
    dropdown += '<div class="new-line"></div>';
  }

  dropdown += '</div> \
    </li>';
  dropdown += '<li><a href="#"><span data-text="true">Cell</span> <i class="fa fa-chevron-right"></i></a> \
    <ul> \
      <li data-cmd="insertCellBefore"><a href="#" data-text="true">Insert cell before</a></li> \
      <li data-cmd="insertCellAfter"><a href="#" data-text="true">Insert cell after</a></li> \
      <li data-cmd="deleteCell"><a href="#" data-text="true">Delete cell</a></li> \
      <li data-cmd="mergeCells"><a href="#" data-text="true">Merge cells</a></li> \
      <li data-cmd="splitHorizontal"><a href="#" data-text="true">Horizontal split</a></li> \
      <li data-cmd="splitVertical"><a href="#" data-text="true">Vertical split</a></li> \
    </ul></li>';
  dropdown += '<li><a href="#"><span data-text="true">Row</span> <i class="fa fa-chevron-right"></i></a> \
    <ul> \
      <li data-cmd="insertRowAbove"><a href="#" data-text="true">Insert row above</a></li> \
      <li data-cmd="insertRowBelow"><a href="#" data-text="true">Insert row below</a></li> \
      <li data-cmd="deleteRow"><a href="#" data-text="true">Delete row</a></li> \
    </ul></li>';
  dropdown += '<li><a href="#"><span data-text="true">Column</span> <i class="fa fa-chevron-right"></i></a> \
    <ul> \
      <li data-cmd="insertColumnBefore"><a href="#" data-text="true">Insert column before</a></li> \
      <li data-cmd="insertColumnAfter"><a href="#" data-text="true">Insert column after</a></li> \
      <li data-cmd="deleteColumn"><a href="#" data-text="true">Delete column</a></li> \
    </ul></li>';
  dropdown += '<li data-cmd="deleteTable"><a href="#" data-text="true">Delete table</a></li>';

  dropdown += '</ul>';

  return dropdown;
};

$.Editable.prototype.bindTableDropdownEvents = function () {
  var that = this;
  this.$bttn_wrapper.on('mouseenter', '.fr-table .select-table > span', function () {
    var row = $(this).data('val');
    var col = $(this).data('param');

    that.$bttn_wrapper.find('.fr-table .select-table .fr-t-info').text(row + ' x ' + col);
    that.$bttn_wrapper.find('.fr-table .select-table > span').removeClass('hover');

    for (var i = 1; i <= 10; i++) {
      for (var j = 0; j <= 10; j++) {
        var $btn = that.$bttn_wrapper.find('.fr-table .select-table > span[data-val="' + i + '"][data-param="' + j + '"]');
        if (i <= row && j <= col) {
          $btn.addClass('hover');
        } else if ((i <= row + 1 || i <= 5) && (j <= col + 1 || j <= 5)) {
          $btn.css('display', 'inline-block');
        } else if ( i > 5 || j > 5) {
          $btn.css('display', 'none');
        }
      }
    }
  });

  this.$bttn_wrapper.on('mouseleave', '.fr-table .select-table', function () {
    that.$bttn_wrapper.find('.fr-table .select-table > span[data-val="1"][data-param="1"]').trigger('mouseenter');
  });
};

$.Editable.prototype.tableMap = function () {
  var $table = this.currentTable();
  var map = [];

  if ($table) {
    $table.find('tr').each (function (row, tr) {
      var $tr = $(tr);

      var c_index = 0;
      $tr.find('td').each (function (col, td) {
        var $td = $(td);
        var cspan = parseInt($td.attr('colspan')) || 1;
        var rspan = parseInt($td.attr('rowspan')) || 1;

        for (var i = row; i < row + rspan; i++) {
          for (var j = c_index; j < c_index + cspan; j++) {
            if (!map[i]) map[i] = [];
            if (!map[i][j]) {
              map[i][j] = td;
            } else {
              c_index++;
            }
          }
        }

        c_index += cspan;
      })
    })
  }

  return map;
};

$.Editable.prototype.cellOrigin = function(td, map) {
  for (var i = 0; i < map.length; i++) {
    for (var j = 0; j < map[i].length; j++) {
      if (map[i][j] == td) {
        return {
          row: i,
          col: j
        };
      }
    }
  }
};

$.Editable.prototype.canMergeCells = function () {
  var tds = this.getSelectionCells();

  if (tds.length < 2) {
    return false;
  }

  var map = this.tableMap();
  var total_area = 0;
  var left_p = 32000;
  var right_p = 0;
  var top_p = 32000;
  var bottom_p = 0;

  for (var i = 0; i < tds.length; i++) {
    var $td = $(tds[i]);
    var cspan = parseInt($td.attr('colspan')) || 1;
    var rspan = parseInt($td.attr('rowspan')) || 1;
    var cell_origin = this.cellOrigin(tds[i], map);

    total_area += cspan * rspan;

    left_p = Math.min(left_p, cell_origin.col);
    right_p = Math.max(right_p, cell_origin.col + cspan);
    top_p = Math.min(top_p, cell_origin.row);
    bottom_p = Math.max(bottom_p, cell_origin.row + rspan);
  }

  if (total_area == (right_p - left_p) * (bottom_p - top_p)) {
    return {
      row: top_p,
      col: left_p,
      colspan: (right_p - left_p),
      rowspan: (bottom_p - top_p),
      map: map,
      cells: tds
    };
  }

  return null;
};

/**
 * Get current cell.
 */
$.Editable.prototype.currentCell = function () {
  var cells = this.getSelectionCells();
  if (cells.length > 0) {
    return cells[0];
  }

  return null;
};

/**
 * Get current table.
 */
$.Editable.prototype.currentTable = function () {
  var $table = $(this.getSelectionElement());

  while ($table.get(0) != this.$element.get(0) && $table.get(0) != $('body').get(0) && $table.get(0).tagName != 'TABLE') {
    $table = $table.parent();
  }

  if ($table.get(0) != this.$element.get(0)) {
    return $table;
  }

  return null;
}

$.Editable.prototype.focusOnTable = function () {
  var $table = this.currentTable();
  if ($table) {
    var $first_td = $table.find('td:first');
    this.setSelection($first_td.get(0));
  }
}

$.Editable.prototype.insertCell = function (action) {
  var tds = this.getSelectionCells();

  for (var i = 0; i < tds.length; i++) {
    var $td = $(tds[i]);

    if (action == 'before') {
      $td.before($td.clone().removeAttr('colspan').removeAttr('rowspan').html('<br/>'));
    }

    else if (action == 'after') {
      $td.after($td.clone().removeAttr('colspan').removeAttr('rowspan').html('<br/>'));
    }
  }

  if (action == 'before') {
    this.callback('insertCellBefore');
  }

  else if (action == 'after') {
    this.callback('insertCellAfter');
  }
}

$.Editable.prototype.mergeCells = function () {
  var merge = this.canMergeCells();
  if (merge) {
    var $td = $(merge.map[merge.row][merge.col]);
    $td.attr('colspan', merge.colspan);
    $td.attr('rowspan', merge.rowspan);

    for (var i = 0; i < merge.cells.length; i++) {
      var cell = merge.cells[i];
      if ($td.get(0) != cell) {
        var $cell = $(cell);
        $td.append($cell.html());
        $cell.remove();
      }
    }

    this.setSelection($td.get(0));
  }

  this.callback('mergeCells');
}

$.Editable.prototype.deleteCell = function () {
  var tds = this.getSelectionCells();

  for (var i = 0; i < tds.length; i++) {
    var $td = $(tds[i]);
    $td.remove();
  }

  this.focusOnTable();
  this.callback('deleteCell');
}

$.Editable.prototype.insertHeader = function () {
  var $table = this.currentTable();

  if ($table && $table.find(' > thead').length > 0) {


    this.callback('insertHeader');
  }
}

$.Editable.prototype.deleteHeader = function () {

}

$.Editable.prototype.insertColumn = function (action) {
  var td = this.currentCell();

  if (td) {
    var $td = $(td);
    var map = this.tableMap();
    var td_origin = this.cellOrigin($td.get(0), map);

    for (var i = 0; i < map.length; i++) {
      var map_td = map[i][td_origin.col];
      var cspan = parseInt($(map_td).attr('colspan')) || 1;
      var rspan = parseInt($(map_td).attr('rowspan')) || 1;
      var last_td = null;

      if (action == 'before') {
        var before_td = map[i][td_origin.col - 1];
        if (before_td) {
          if (before_td == map_td) {
            $(before_td).attr('colspan', cspan + 1);
          } else if (rspan > 1) {
            $(before_td).after('<td><br/></td>');
          } else {
            $(map_td).before('<td><br/></td>');
          }
        } else {
          $(map_td).before('<td><br/></td>');
        }
      } else if (action == 'after') {
        var after_td = map[i][td_origin.col + 1];
        if (after_td) {
          if (after_td == map_td) {
            $(after_td).attr('colspan', cspan + 1);
          } else if (rspan > 1) {
            $(after_td).before('<td><br/></td>');
          } else {
            $(map_td).after('<td><br/></td>');
          }
        } else {
          $(map_td).after('<td><br/></td>');
        }
      }
    }
  }

  if (action == 'before') {
    this.callback('insertColumnBefore');
  }

  else if (action == 'after') {
    this.callback('insertColumnAfter');
  }
}

$.Editable.prototype.deleteColumn = function () {
  var tds = this.getSelectionCells();

  for (var j = 0; j < tds.length; j++) {
    var $td = $(tds[j]);
    var map = this.tableMap();
    var td_origin = this.cellOrigin($td.get(0), map);

    for (var i = 0; i < map.length; i++) {
      var map_td = map[i][td_origin.col];
      var cspan = parseInt($(map_td).attr('colspan')) || 1;
      var rspan = parseInt($(map_td).attr('rowspan')) || 1;
      var last_td = null;

      if (cspan == 1) {
        $(map_td).remove();
      } else {
        var map_td_origin = this.cellOrigin(map_td, map);
        $(map_td).attr('colspan', cspan - 1);
      }
    }
  }

  this.focusOnTable();
  this.callback('deleteColumn');
};

$.Editable.prototype.insertRow = function (action) {
  var td = this.currentCell();

  if (td) {
    var $td = $(td);
    var map = this.tableMap();
    var td_origin = this.cellOrigin($td.get(0), map);

    var cell_no = 0;
    var last_td = null;
    for (var i = 0; i < map[td_origin.row].length; i++) {
      var map_td = map[td_origin.row][i];
      var cspan = parseInt($(map_td).attr('colspan')) || 1;
      var rspan = parseInt($(map_td).attr('rowspan')) || 1;

      if (action == 'above') {
        // First row.
        if (td_origin.row == 0) {
          cell_no++;
        }
        else {
          var above_td = map[td_origin.row - 1][i];

          // Rowspan.
          if (above_td == map_td && last_td != map_td) {
            $(map_td).attr('rowspan', rspan + 1);
          } else {
            cell_no++;
          }
        }
      } else if (action == 'below') {
        // Last row.
        if (td_origin.row == map.length - 1) {
          cell_no++;
        }
        else {
          var below_td = map[td_origin.row + 1][i];

          // Rowspan.
          if (below_td == map_td && last_td != map_td) {
            $(map_td).attr('rowspan', rspan + 1);
          } else {
            cell_no++;
          }
        }
      }

      last_td = map[td_origin.row][i];
    }

    var tr = '<tr>';
    for (var i = 0; i < cell_no; i++) {
      tr += '<td><br/></td>';
    }
    tr += '</tr>';

    if (action == 'below') {
      $td.closest('tr').after(tr);
    }
    else if (action == 'above' ) {
      $td.closest('tr').before(tr);
    }
  }

  if (action == 'below') {
    this.callback('insertRowBelow');
  }
  else if (action == 'above' ) {
    this.callback('insertRowAbove');
  }
}

$.Editable.prototype.deleteRow = function () {
  var tds = this.getSelectionCells();

  for (var j = 0; j < tds.length; j++) {
    var $td = $(tds[j]);
    var map = this.tableMap();
    var td_origin = this.cellOrigin($td.get(0), map);
    var $tr = $td.parents('tr:first');

    for (var i = 0; i < map[td_origin.row].length; i++) {
      var map_td = map[td_origin.row][i];
      var cspan = parseInt($(map_td).attr('colspan')) || 1;
      var rspan = parseInt($(map_td).attr('rowspan')) || 1;

      if (rspan == 1) {
        $(map_td).remove()
      } else {
        var map_td_origin = this.cellOrigin(map_td, map);
        $(map_td).attr('rowspan', rspan - 1);

        if (map_td_origin.row == td_origin.row) {
          var next_row = map[td_origin.row + 1];
          if (next_row) {
            if (next_row[ i - 1]) {
              $(next_row[i - 1]).after($(map_td).clone())
              $(map_td).remove()
            }
          }
        }
      }
    }

    $tr.remove();
  }

  this.focusOnTable();
  this.callback('deleteRow');
}

$.Editable.prototype.splitVertical = function () {
  var tds = this.getSelectionCells();

  for (var j = 0; j < tds.length; j++) {
    var $td = $(tds[j]);
    var map = this.tableMap();
    var td_origin = this.cellOrigin($td.get(0), map);
    var cspan = parseInt($td.attr('colspan')) || 1;
    var rspan = parseInt($td.attr('rowspan')) || 1;

    if (rspan > 1) {
      var insert_row_rspan = Math.floor(rspan / 2);
      var insert_row = td_origin.row + (rspan - insert_row_rspan);

      var row_td = map[insert_row][td_origin.col - 1];
      if (!row_td) {
        row_td = map[insert_row][td_origin.col + cspan];
      }

      if (row_td) {
        $(row_td).before($td.clone().attr('rowspan', insert_row_rspan).html('<br/>'))
      } else {
        $td.parents('tr:first').after($('<tr>').append($td.clone().attr('rowspan', insert_row_rspan).html('<br/>')));
      }

      $td.attr('rowspan', rspan - insert_row_rspan);

    } else {
      var $new_tr = $('<tr>').append($td.clone().html('<br/>'));

      var last_td = null;
      for (var i = 0; i < map[td_origin.row].length; i++) {
        var map_td = map[td_origin.row][i];
        var crspan = parseInt($(map_td).attr('rowspan')) || 1;
        if (last_td != map_td && map_td != $td.get(0)) {
          $(map_td).attr('rowspan', crspan + 1);
        }

        last_td = map_td;
      }

      $td.parents('tr:first').after($new_tr);
    }
  }

  this.callback('splitHorizontal');
};

$.Editable.prototype.splitHorizontal = function () {
  var tds = this.getSelectionCells();

  for (var j = 0; j < tds.length; j++) {
    var $td = $(tds[j]);
    var map = this.tableMap();
    var td_origin = this.cellOrigin($td.get(0), map);
    var cspan = parseInt($td.attr('colspan')) || 1;
    var rspan = parseInt($td.attr('rowspan')) || 1;

    if (cspan > 1) {
      var insert_td_cspan = Math.floor(cspan / 2);
      $td.after($td.clone().attr('colspan', insert_td_cspan).html('<br/>'));
      $td.attr('colspan', cspan - insert_td_cspan);
    } else {
      var last_td = null;
      for (var i = 0; i < map.length; i++) {
        var map_td = map[i][td_origin.col];
        var ccspan = parseInt($(map_td).attr('colspan')) || 1;

        if (last_td != map_td && map_td != $td.get(0)) {
          $(map_td).attr('colspan', ccspan + 1);
        }

        last_td = map_td;
      }

      $td.after($td.clone().html('<br/>'))
    }
  }

  this.callback('splitVertical');
};

/**
 * Insert table.
 */
$.Editable.prototype.insertTable = function (rows, cols) {
  var table = '<table class="f-t-l" width="100%">';
  for (var i = 0; i < rows; i++) {
    table += '<tr>';
    for (var j = 0; j < cols; j++) {
      table += '<td><br/></td>';
    }
    table += '</tr>';
  }
  table += '</table>';

  this.insertHTML(table);
  var $table = this.$element.find('table.f-t-l');
  $table.removeClass('f-t-l');
  this.setSelection($table.find('td:first').get(0));
  this.$element.focus();

  this.callback('insertTable');
}

$.Editable.prototype.deleteTable = function () {
  var $table = this.currentTable();

  if ($table) {
    $table.remove();
    this.callback('deleteTable');
  }
}