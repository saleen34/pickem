$(function()
{

  // Item Model
  // ----------

      // Our basic **Item** model has `title`, `order`, and `done` attributes.
    var Item = Backbone.Model.extend(
    {

        defaults: function() 
        {
            return {
                title: "n/a",
                order: Items.nextOrder(),
                done: false
            };
        },

        initialize: function() 
        {
            if (!this.get("title")) 
            {
                this.set({"title": this.defaults.title});
            }
        },

        toggle: function() 
        {
            this.save({done: !this.get("done")});
        },

        // Remove this Item from *localStorage* and delete its view.
        clear: function() 
        {
            this.destroy();
        }

    });

  // Item Collection
  // ---------------

    // The collection of items is backed by *localStorage* instead of a remote
    // server.
    var ItemList = Backbone.Collection.extend(
    {

        // Reference to this collection's model.
        model: Item,

        // Save all of the item items under the `"items"` namespace.
        localStorage: new Store("items-backbone"),

        // Filter down the list of all item items that are finished.
        done: function() 
        {
            return this.filter(function(item){ return item.get('done'); });
        },

        // Filter down the list to only item items that are still not finished.
        remaining: function() 
        {
            return this.without.apply(this, this.done());
        },

        // We keep the Items in sequential order, despite being saved by unordered
        // GUID in the database. This generates the next order number for new items.
        nextOrder: function() 
        {
            if (!this.length) return 1;
                return this.last().get('order') + 1;
        },

        // Items are sorted by their original insertion order.
        comparator: function(item) 
        {
            return item.get('order');
        }

    });

  // Create our global collection of **Items**.
  var Items = new ItemList;

  // Item Item View
  // --------------

    // The DOM element for a item item...
    var ItemView = Backbone.View.extend(
    {

        //... is a list tag.
        tagName:  "li",

        // Cache the template function for a single item.
        template: _.template($('#item-template').html()),

        // The DOM events specific to an item.
        events: 
        {
            "click .view"  : "edit",
            "click a.destroy" : "clear",
            "keypress .edit"  : "updateOnEnter",
            "blur .edit"      : "close"
        },

        // The ItemView listens for changes to its model, re-rendering. Since there's
        // a one-to-one correspondence between a **Item** and a **ItemView** in this
        // app, we set a direct reference on the model for convenience.
        initialize: function() 
        {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },

        // Re-render the titles of the item item.
        render: function() 
        {
            this.$el.html(this.template(this.model.toJSON()));
            this.$el.toggleClass('done', this.model.get('done'));
            this.input = this.$('.edit');
            return this;
        },

        // Toggle the `"done"` state of the model.
        toggleDone: function() 
        {
            this.model.toggle();
        },

        // Switch this view into `"editing"` mode, displaying the input field.
        edit: function() 
        {
            this.$el.addClass("editing");
            this.input.focus();
        },

        // Close the `"editing"` mode, saving changes to the item.
        close: function() 
        {
            var value = this.input.val();
            if (!value) this.clear();
            this.model.save({title: value});
            this.$el.removeClass("editing");
        },

        // If you hit `enter`, we're through editing the item.
        updateOnEnter: function(e) 
        {
            if (e.keyCode == 13) this.close();
        },

        // Remove the item, destroy the model.
        clear: function() 
        {
            this.model.clear();
        }

    });

  // The Application
  // ---------------

    // Our overall **AppView** is the top-level piece of UI.
    var AppView = Backbone.View.extend(
    {

    // Instead of generating a new element, bind to the existing skeleton of
    // the App already present in the HTML.
    el: $("#itemapp"),

    // Our template for the line of statistics at the bottom of the app.
    statsTemplate: _.template($('#stats-template').html()),

    // Delegated events for creating new items, and clearing completed ones.
    events: 
    {
        "keypress #new-item":  "createOnEnter"
    },

    // At initialization we bind to the relevant events on the `Items`
    // collection, when items are added or changed. Kick things off by
    // loading any preexisting items that might be saved in *localStorage*.
    initialize: function() 
    {

        this.input = this.$("#new-item");

        Items.bind('add', this.addOne, this);
        Items.bind('reset', this.addAll, this);
        Items.bind('all', this.render, this);

        this.footer = this.$('footer');
        this.main = $('#main');

        Items.fetch();
    },

    // Re-rendering the App just means refreshing the statistics -- the rest
    // of the app doesn't change.
    render: function() 
    {
        var done = Items.done().length;
        var remaining = Items.remaining().length;

        if (Items.length) 
        {
            this.main.show();
            this.footer.show();
            this.footer.html(this.statsTemplate({done: done, remaining: remaining}));
        } 
        else
        {
            this.main.hide();
            this.footer.hide();
        }

    },

    // Add a single item item to the list by creating a view for it, and
    // appending its element to the `<ul>`.
    addOne: function(item) 
    {
        var view = new ItemView({model: item});
        this.$("#item-list").append(view.render().el);
    },

    // Add all items in the **Items** collection at once.
    addAll: function() 
    {
        Items.each(this.addOne);
    },

    // If you hit return in the main input field, create new **Item** model,
    // persisting it to *localStorage*.
    createOnEnter: function(e) 
    {
        if (e.keyCode != 13) return;
        if (!this.input.val()) return;

        Items.create({title: this.input.val()});
        this.input.val('');
    }

    });

    var AppRouter = Backbone.Router.extend(
    {
        routes:
        {
            "edit" : "edit"
        },

        initialize: function()
        {
           window.location.hash = "edit";
        },

        edit: function()
        {
            var App = new AppView;
        }
    });

    var appRouter = new AppRouter;
    Backbone.history.start();
});