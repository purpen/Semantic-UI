(function() {
  var docpadConfig;

  docpadConfig = {
    srcPath: './server',
    outPath: './docs',
    templateData: {
      site: {
        url: "http://www.semantic-ui.com",
        oldUrls: ['learnsemantic.com'],
        title: "Semantic UI",
        description: "Semantic empowers designers and developers by creating a shared vocabulary for UI.",
        keywords: "html5, ui, library, framework, javascript"
      },
      getPreparedTitle: function() {
        if (this.document.title) {
          return "" + this.document.title + " | " + this.site.title;
        } else {
          return this.site.title;
        }
      },
      getPage: function(collection, id) {
        var index, item, selectedIndex, _i, _len;
        for (index = _i = 0, _len = collection.length; _i < _len; index = ++_i) {
          item = collection[index];
          if (item.id === id) {
            selectedIndex = index + 1;
          }
        }
        return selectedIndex;
      },
      pageCount: function(collection) {
        var index, item, itemCount, _i, _len;
        for (index = _i = 0, _len = collection.length; _i < _len; index = ++_i) {
          item = collection[index];
          itemCount = index + 1;
        }
        return itemCount;
      },
      getPageCollection: function(collection, id, delta) {
        var bottomCount, bottomDelta, bottomIndex, index, item, lastIndex, result, selectedIndex, topCount, topDelta, topIndex, _i, _len;
        if (delta == null) {
          delta = 2;
        }
        for (index = _i = 0, _len = collection.length; _i < _len; index = ++_i) {
          item = collection[index];
          if (item.id === id) {
            selectedIndex = index;
          }
          lastIndex = index;
        }
        bottomCount = selectedIndex - delta >= 0 ? delta : selectedIndex;
        topCount = selectedIndex + delta <= lastIndex ? delta : lastIndex - selectedIndex;
        bottomDelta = delta * 2 - topCount;
        topDelta = delta * 2 - bottomCount;
        bottomIndex = selectedIndex - bottomDelta >= 0 ? selectedIndex - bottomDelta : 0;
        topIndex = selectedIndex + topDelta <= lastIndex ? selectedIndex + topDelta : lastIndex;
        result = collection.slice(bottomIndex, +topIndex + 1 || 9e9);
        return result;
      },
      getPreparedDescription: function() {
        return this.document.description || this.site.description;
      },
      getPreparedKeywords: function() {
        return this.site.keywords.concat(this.document.keywords || []).join(', ');
      }
    },
    collections: {
      uiElements: function() {
        return this.getCollection("documents").findAllLive({
          type: {
            $in: ['UI Element']
          }
        }, [
          {
            title: 1
          }
        ]);
      },
      uiCollections: function() {
        return this.getCollection("documents").findAllLive({
          type: {
            $in: ['UI Collection']
          }
        }, [
          {
            title: 1
          }
        ]);
      },
      uiViews: function() {
        return this.getCollection("documents").findAllLive({
          type: {
            $in: ['UI View']
          }
        }, [
          {
            title: 1
          }
        ]);
      },
      uiModules: function() {
        return this.getCollection("documents").findAllLive({
          type: {
            $in: ['UI Module', 'UI Behavior']
          }
        }, [
          {
            title: 1
          }
        ]);
      }
    }
  };

  module.exports = docpadConfig;

}).call(this);
